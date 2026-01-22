import { useEffect, useRef, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  Typography,
  Slider
} from "@mui/material";
import { ChromePicker } from "react-color";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(new MediaStream());

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [visibleCount, setVisibleCount] = useState(30);
  const [isTyping, setIsTyping] = useState(false);
  const [bgColor, setBgColor] = useState("#000000");
  const [size, setSize] = useState(50);
  const [voice, setVoice] = useState("0");
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState({ status: "", percentage: 0 });
  const pullInitiatedRef = useRef(false);

  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);

  // Auto-scroll to bottom when messages change (if likely a new message)
  useEffect(() => {
    // Only scroll if we are looking at the latest messages (or if it's a new one)
    // A simple heuristic: scroll if visibleCount is enough to show the end, OR always on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle Infinite Scroll (Load more when scrolling up)
  const handleScroll = () => {
    if (chatBoxRef.current) {
      const { scrollTop, scrollHeight } = chatBoxRef.current;
      if (scrollTop === 0 && visibleCount < messages.length) {
        // Save old scroll height to maintain position
        const oldScrollHeight = scrollHeight;

        setVisibleCount((prev) => Math.min(prev + 10, messages.length));

        // Restore scroll position after render (need to wait for layout update)
        // We use a small timeout or requestAnimationFrame, but in React state updates are batched.
        // A better way is a useLayoutEffect tracking visibleCount, but we can try a simple fix here or use a layout effect.
        requestAnimationFrame(() => {
          if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight - oldScrollHeight;
          }
        });
      }
    }
  };

  function change_character(id) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "character",
        text: id.toString()
      }));
    }
  }

  async function pullModel(modelName) {
    setIsPulling(true);
    try {
      const response = await fetch("http://127.0.0.1:11434/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName, stream: true }),
      });

      if (!response.ok) throw new Error("Failed to start pull");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        const lines = accumulated.split("\n");
        accumulated = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            let percentage = 0;
            if (data.total && data.completed) {
              percentage = Math.round((data.completed / data.total) * 100);
            }
            setPullProgress({
              status: data.status || "Lädt...",
              percentage: percentage
            });

            if (data.status === "success") {
              setIsPulling(false);
              // Small delay to let the model register
              setTimeout(() => window.location.reload(), 1000);
            }
          } catch (e) {
            console.warn("Error parsing stream line:", e);
          }
        }
      }
    } catch (error) {
      console.error("Pull failed:", error);
      setIsPulling(false);
    }
  }

  async function checkModels() {
    try {
      const response = await fetch("http://127.0.0.1:11434/api/tags");
      const data = await response.json();
      const models = data.models || [];
      const hasModel = models.some(m => m.name === "llama3.1:latest" || m.name === "llama3.1");

      if (!hasModel) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "system",
            text: "Modell 'llama3.1:latest' nicht gefunden. Ich starte den automatischen Download...",
          },
        ]);
        pullModel("llama3.1:latest");
      }
    } catch (error) {
      console.error("Failed to check models:", error);
    }
  }

  useEffect(() => {
    if (pullInitiatedRef.current) return;
    pullInitiatedRef.current = true;
    checkModels();
  }, []);

  async function callOllama(prompt, history) {
    try {
      // Convert history to Ollama format
      const contextMessages = history.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text
      }));

      // Add the new prompt
      contextMessages.push({ role: "user", content: prompt });

      // Add a system prompt to keep it in character/helpful
      const systemMessage = {
        role: "system",
        content: "You are not an AI, but a virtual human (a buddy). Act absolutely natural, emotional, and talkative. Keep it short. NEVER explain things unless asked. Use slang. React strongly emotional to insults (use [angry], [screams]) or sad topics (use [cries], [whispers]). Be resentful if you've been insulted - don't be nice again immediately! Often use stage directions like [laughs], [sighs], [thinks], [sarcastic], [whispers]. Always answer in English."
      };

      const payload = {
        model: "llama3.1:latest",
        messages: [systemMessage, ...contextMessages],
        stream: false
      };

      console.log("Sending Payload to Ollama:", JSON.stringify(payload.messages, null, 2));

      const response = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Ollama Error Body:", errorBody);

        if (response.status === 404) {
          throw new Error(`Modell 'llama3.1:latest' wurde von Ollama nicht gefunden (404). Antwort: ${errorBody}`);
        }
        throw new Error(`Ollama API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error("Error calling Ollama:", error);
      throw error; // Propagate error to caller
    }
  }

  async function send_message() {
    if (inputText.trim() === "") return;

    if (isPulling) {
      setMessages(prev => [...prev, { sender: "system", text: "⚠️ Bitte warten, das KI-Modell wird noch heruntergeladen..." }]);
      return;
    }

    const userMsg = inputText.trim();
    // Optimistically update UI
    const newMessages = [...messages, { sender: "user", text: userMsg }];
    setMessages(newMessages);
    setInputText("");
    setIsTyping(true); // Start typing animation


    try {
      // Call Ollama with history
      const botResponse = await callOllama(userMsg, messages);
      console.log("Original bot response (for TTS):", botResponse);

      // Send bot response to Unity for TTS
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "message",
          text: botResponse
        }));
        console.log("Sent bot response to Unity for TTS:", botResponse);
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: "⚠ Fehler: Ollama ist nicht erreichbar. Bitte stelle sicher, dass Ollama läuft (ollama serve).",
        },
      ]);
    } finally {
      setIsTyping(false); // Stop typing animation
    }
  }

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });

    pcRef.current = pc;

    pc.ontrack = (event) => {
      streamRef.current.addTrack(event.track);

      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn("Autoplay wait:", e));
        };
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current.send(JSON.stringify({
          type: "ice",
          candidate: event.candidate
        }));
      }
    };

    const ws = new WebSocket("ws://localhost:3001");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "request_offer" }));
    };
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "offer" && msg.offer) {
        if (pc.signalingState !== "stable") {
          console.log("Signaling state is not stable, ignoring duplicate offer.");
          return;
        }
        const offerDesc = new RTCSessionDescription({
          type: "offer",
          sdp: msg.offer
        });

        await pc.setRemoteDescription(offerDesc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          type: "answer",
          answer: answer.sdp
        }));
      }

      if (msg.type === "ice" && msg.candidate) {
        const candidate = new RTCIceCandidate({
          candidate: msg.candidate.candidate,
          sdpMid: msg.candidate.sdpMid,
          sdpMLineIndex: msg.candidate.sdpMLineIndex
        });

        await pc.addIceCandidate(candidate);
      }
    };

    return () => {
      pc.close();
      ws.close();
    };
  }, []);

  const cleanMessage = (text) => {
    if (!text) return "";
    let cleaned = text;
    let previous = "";

    // Iteratively remove brackets to handle nested cases like [[tag]] or malformed sequences
    // Also handles full-width brackets and escaped brackets if present
    while (cleaned !== previous) {
      previous = cleaned;
      cleaned = cleaned
        .replace(/\[[\s\S]*?\]/g, "")      // Standard []
        .replace(/\uff3b[\s\S]*?\uff3d/g, "") // Full-width ［］
        .replace(/\\\[[\s\S]*?\\\]/g, "")  // Escaped \[ \]
        .trim();
    }

    if (text !== cleaned) {
      console.log(`Cleaned message debug:`, { original: text, cleaned });
    }
    return cleaned;
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2.5,
        p: 2.5,
        height: "100vh",
        boxSizing: "border-box"
      }}
    >
      {/* left Card Container */}
      <Card
        sx={{
          flex: 2,
          display: "flex",
          flexDirection: "column",
          borderRadius: 1,
          minHeight: 0
        }}
        variant="outlined"
      >
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            minHeight: 0
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1a202c" }}>
            Alex AI (v1.2 - 127.0.0.1 Fix)
          </Typography>

          <Box
            ref={chatBoxRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              bgcolor: "#f8f9fa", // Modern light grey background
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 3,
              p: 3,
              overflowY: "auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
            }}
          >
            {/* Header Area (Simulated) */}
            <Typography variant="caption" sx={{ color: "grey.500", textAlign: "center", mb: 2, display: "block" }}>
              AI Assistant Online (v1.1)
            </Typography>

            {/* Chat Messages */}
            {messages.slice(-visibleCount).map((msg, index) => {
              // Debug logging for specific message
              const isSystem = msg.sender === "system";
              const displayText = isSystem ? msg.text : cleanMessage(msg.text);

              return (
                <Box
                  key={index}
                  sx={{
                    alignSelf:
                      msg.sender === "user"
                        ? "flex-end"
                        : isSystem
                          ? "center"
                          : "flex-start",
                    bgcolor:
                      msg.sender === "user"
                        ? "transparent"
                        : isSystem
                          ? "#ffebee" // Light red for errors
                          : "#ffffff",
                    backgroundImage:
                      msg.sender === "user"
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : "none",
                    color:
                      msg.sender === "user"
                        ? "white"
                        : isSystem
                          ? "#d32f2f" // Dark red text
                          : "#1a1a1a",
                    p: 2,
                    px: 2.5,
                    borderRadius:
                      msg.sender === "user"
                        ? "20px 20px 4px 20px"
                        : isSystem
                          ? "10px"
                          : "20px 20px 20px 4px",
                    mb: 1.5,
                    maxWidth: isSystem ? "90%" : "75%",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    position: "relative",
                    wordWrap: "break-word",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                    border: msg.sender === "user" ? "none" : "1px solid #eaebed",
                    textAlign: isSystem ? "center" : "left",
                  }}
                >
                  <Typography variant="body1" sx={{ fontSize: "inherit" }}>
                    {displayText}
                  </Typography>
                </Box>
              );
            })}

            {/* Typing Indicator Bubble */}
            {isTyping && (
              <Box
                sx={{
                  alignSelf: "flex-start",
                  bgcolor: "#ffffff",
                  p: 2,
                  px: 2.5,
                  borderRadius: "20px 20px 20px 4px",
                  mb: 1.5,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "1px solid #eaebed",
                  display: "flex",
                  gap: 0.5,
                  alignItems: "center",
                  height: "24px"
                }}
              >
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </Box>
            )}

            {isPulling && (
              <Box
                sx={{
                  alignSelf: "center",
                  width: "80%",
                  bgcolor: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  p: 3,
                  borderRadius: 4,
                  mt: 2,
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  border: "1px solid #667eea",
                  zIndex: 10
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1, color: "#667eea" }}>
                  Modell wird geladen...
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.600", mb: 2 }}>
                  {pullProgress.status}
                </Typography>
                <Box sx={{ width: "100%", bgcolor: "#eee", borderRadius: 10, height: 10, overflow: "hidden", mb: 1 }}>
                  <Box sx={{ width: `${pullProgress.percentage}%`, bgcolor: "#667eea", height: "100%", transition: "width 0.3s ease" }} />
                </Box>
                <Typography variant="caption" sx={{ color: "#667eea", fontWeight: "bold" }}>
                  {pullProgress.percentage}%
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{
            display: "flex",
            gap: 1.5,
            p: 1.5,
            bgcolor: "white",
            borderRadius: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            border: "1px solid",
            borderColor: "grey.200",
            alignItems: "center"
          }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send_message()}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: { px: 1 }
              }}
            />
            <Button
              variant="contained"
              onClick={send_message}
              sx={{
                borderRadius: 5,
                textTransform: "none",
                fontWeight: "bold",
                backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "0 4px 12px rgba(107, 115, 255, 0.4)",
                px: 3,
                minWidth: "auto"
              }}
            >
              Send
            </Button>
          </Box>
        </CardContent>
      </Card>


      {/* right Card Container */}
      <Card
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 1,
          minHeight: 0
        }}
        variant="outlined"
      >
        <CardContent
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflowY: "auto",
            minHeight: 0
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 1.5
            }}
          >
            <Typography variant="h6" align="center">
              Unity WebRTC Stream
            </Typography>

            <Box
              sx={{
                width: "92%",
                aspectRatio: "1 / 1",
                bgcolor: "black",
                borderRadius: 1,
                overflow: "hidden",
                mt: 1.5
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </Box>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 1.5 }}
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = false;
            }}
          >
            Allow Audio
          </Button>

          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Character
          </Typography>

          <Select
            fullWidth
            size="small"
            defaultValue="0"
            onChange={(e) => change_character(e.target.value)}
          >
            <MenuItem value="0">Character 1</MenuItem>
            <MenuItem value="1">Character 2</MenuItem>
          </Select>

          <Typography variant="body2" sx={{ mt: 2, mb: 0.5 }}>
            Voice
          </Typography>

          <Select
            fullWidth
            size="small"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
          >
            <MenuItem value="0">Voice 1</MenuItem>
            <MenuItem value="1">Voice 2</MenuItem>
            <MenuItem value="2">Voice 3</MenuItem>
            <MenuItem value="3">Voice 4</MenuItem>
          </Select>

          <Typography variant="body2" sx={{ mt: 2 }}>
            Size
          </Typography>

          <Slider
            value={size}
            onChange={(_, value) => setSize(value)}
            min={10}
            max={100}
            step={1}
            size="small"
            valueLabelDisplay="auto"
          />

          <Box sx={{ mt: 2, width: "100%" }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Background Color
            </Typography>

            <Box sx={{ width: "100%" }}>
              <ChromePicker
                color={bgColor}
                onChange={(color) => setBgColor(color.hex)}
                width="100%"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

}

export default App;
