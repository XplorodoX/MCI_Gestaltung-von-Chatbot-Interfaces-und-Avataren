"use client";

import React, { useState, useRef, useEffect } from 'react';
import PixelStreamingPlayer, { PixelStreamingPlayerRef } from './PixelStreamingPlayer';

interface Message {
    id: number;
    text: string;
    sender: 'bot' | 'user';
    emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking';
    audio?: string;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    model: string;
}

const AvatarChat = () => {
    // Chat sessions state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);

    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Hey! 👋 Was geht?", sender: 'bot', emotion: 'happy' }
    ]);
    const [inputText, setInputText] = useState("");
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('llama3.1:latest');
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isPulling, setIsPulling] = useState(false);
    const [pullProgress, setPullProgress] = useState<{ status: string, percentage: number }>({ status: '', percentage: 0 });
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const psRef = useRef<PixelStreamingPlayerRef>(null);
    const pullInitiatedRef = useRef(false);

    // Load sessions from localStorage on mount
    useEffect(() => {
        const savedSessions = localStorage.getItem('chatSessions');
        if (savedSessions) {
            const parsed = JSON.parse(savedSessions);
            setSessions(parsed.map((s: ChatSession) => ({
                ...s,
                createdAt: new Date(s.createdAt)
            })));
        }
    }, []);

    // Save sessions to localStorage when they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('chatSessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    // Auto-save current chat to session
    useEffect(() => {
        if (currentSessionId && messages.length > 1) {
            setSessions((prev: ChatSession[]) => prev.map((session: ChatSession) =>
                session.id === currentSessionId
                    ? { ...session, messages, model: selectedModel }
                    : session
            ));
        }
    }, [messages, currentSessionId, selectedModel]);

    const pullModel = async (modelName: string) => {
        setIsPulling(true);
        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName }),
            });

            if (!response.ok) throw new Error('Failed to start pull');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                accumulated += decoder.decode(value, { stream: true });
                const lines = accumulated.split('\n');
                accumulated = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        let percentage = 0;
                        if (data.total && data.completed) {
                            percentage = Math.round((data.completed / data.total) * 100);
                        }
                        setPullProgress({
                            status: data.status || 'Lädt...',
                            percentage: percentage
                        });

                        if (data.status === 'success') {
                            setIsPulling(false);
                            // Refresh models
                            window.location.reload();
                        }
                    } catch (e) {
                        console.warn('Error parsing stream line:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Pull failed:', error);
            setIsPulling(false);
        }
    };

    // Fetch available models on mount and check Ollama status
    useEffect(() => {
        if (pullInitiatedRef.current) return;
        pullInitiatedRef.current = true;
        const fetchModels = async () => {
            try {
                const response = await fetch('/api/models');
                const data = await response.json();

                if (data.error || !data.models || data.models.length === 0) {
                    setMessages([{
                        id: 1,
                        text: "⚠️ Ollama ist erreichbar, aber es sind keine Modelle geladen. Ich versuche jetzt, 'llama3.1:latest' automatisch für dich zu laden...",
                        sender: 'bot',
                        emotion: 'thinking'
                    }]);
                    setModels([]);
                    // Automatically trigger pull if no models
                    pullModel('llama3.1:latest');
                } else {
                    setModels(data.models);
                    if (data.models.includes('llama3.1:latest') || data.models.includes('llama3.1')) {
                        const found = data.models.find((m: string) => m.startsWith('llama3.1')) || data.models[0];
                        setSelectedModel(found);
                    } else {
                        setSelectedModel(data.models[0]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch models:', error);
                setMessages([{
                    id: 1,
                    text: "⚠️ Konnte keine Verbindung zu Ollama herstellen. Stelle sicher, dass Ollama läuft ('ollama serve') und lade dann die Seite neu.",
                    sender: 'bot',
                    emotion: 'angry'
                }]);
                setModels([]);
            } finally {
                setIsLoadingModels(false);
            }
        };
        fetchModels();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Generate title from first user message
    const generateTitle = (msg: string): string => {
        const maxLen = 30;
        const cleaned = msg.trim();
        if (cleaned.length <= maxLen) return cleaned;
        return cleaned.substring(0, maxLen) + '...';
    };

    // Start new chat
    const startNewChat = () => {
        if (messages.length > 1 && !currentSessionId) {
            const userMsg = messages.find((m: Message) => m.sender === 'user');
            const newSession: ChatSession = {
                id: Date.now().toString(),
                title: userMsg ? generateTitle(userMsg.text) : 'Neuer Chat',
                messages: messages,
                createdAt: new Date(),
                model: selectedModel
            };
            setSessions((prev: ChatSession[]) => [newSession, ...prev]);
        }

        setCurrentSessionId(null);
        setMessages([{ id: 1, text: "Hey! 👋 Was geht?", sender: 'bot', emotion: 'happy' }]);
        setShowSidebar(false);
    };

    // Load a session
    const loadSession = (session: ChatSession) => {
        if (messages.length > 1 && !currentSessionId) {
            const userMsg = messages.find((m: Message) => m.sender === 'user');
            const newSession: ChatSession = {
                id: Date.now().toString(),
                title: userMsg ? generateTitle(userMsg.text) : 'Neuer Chat',
                messages: messages,
                createdAt: new Date(),
                model: selectedModel
            };
            setSessions((prev: ChatSession[]) => [newSession, ...prev]);
        }

        setCurrentSessionId(session.id);
        setMessages(session.messages);
        setSelectedModel(session.model);
        setShowSidebar(false);
    };

    // Delete a session
    const deleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions((prev: ChatSession[]) => prev.filter((s: ChatSession) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
            startNewChat();
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage = inputText;
        const newUserMsg: Message = { id: Date.now(), text: inputText, sender: 'user' };
        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);
        setInputText("");

        if (!currentSessionId && messages.length === 1) {
            const newSession: ChatSession = {
                id: Date.now().toString(),
                title: generateTitle(userMessage),
                messages: updatedMessages,
                createdAt: new Date(),
                model: selectedModel
            };
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const chatHistory = messages.map(msg => ({ text: msg.text, sender: msg.sender }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    model: selectedModel,
                    history: chatHistory
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                console.error("API Error:", errorData.error || response.statusText);
                const errorMsg: Message = { id: Date.now() + 1, text: `Fehler: ${errorData.error || 'Konnte KI nicht erreichen.'}`, sender: 'bot' };
                setMessages((prev: Message[]) => [...prev, errorMsg]);
                return;
            }

            const data = await response.json();
            const newBotMsg: Message = {
                id: Date.now() + 1,
                text: data.text,
                sender: 'bot',
                emotion: data.emotion || 'neutral',
                audio: data.audio
            };
            setMessages((prev: Message[]) => [...prev, newBotMsg]);

            if (data.audio) {
                try {
                    const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
                    await audio.play();

                    // Send to Unreal Engine for lipsync
                    if (psRef.current) {
                        psRef.current.emitUIInteraction({
                            type: 'audio_response',
                            audio: data.audio,
                            text: data.text,
                            emotion: data.emotion
                        });
                    }
                } catch (e) {
                    console.error("Failed to play audio or send to UE:", e);
                }
            }

            console.log("Avatar Emotion:", data.emotion);
        } catch (error) {
            console.error("Network Error:", error);
            let errorText = "Netzwerkfehler.";
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    errorText = "Zeitüberschreitung: Die Anfrage hat zu lange gedauert.";
                } else {
                    errorText = `Fehler: ${error.message}`;
                }
            }
            const errorMsg: Message = { id: Date.now() + 1, text: errorText, sender: 'bot' };
            setMessages((prev: Message[]) => [...prev, errorMsg]);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const formatDate = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Heute';
        if (days === 1) return 'Gestern';
        if (days < 7) return `Vor ${days} Tagen`;
        return date.toLocaleDateString('de-DE');
    };

    return (
        <div className="avatar-chat-container">
            {/* Sidebar for chat history */}
            <div className={`chat-sidebar ${showSidebar ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Chat Verlauf</h3>
                    <button className="close-sidebar" onClick={() => setShowSidebar(false)}>×</button>
                </div>
                <button className="new-chat-btn sidebar-new" onClick={startNewChat}>
                    <span>+</span> Neuer Chat
                </button>
                <div className="sessions-list">
                    {sessions.length === 0 ? (
                        <div className="no-sessions">Keine gespeicherten Chats</div>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                                onClick={() => loadSession(session)}
                            >
                                <div className="session-info">
                                    <span className="session-title">{session.title}</span>
                                    <span className="session-date">{formatDate(session.createdAt)}</span>
                                </div>
                                <button
                                    className="delete-session"
                                    onClick={(e) => deleteSession(session.id, e)}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Overlay when sidebar is open */}
            {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

            {/* Left Side: Chat */}
            <div className="chat-panel">
                <div className="chat-header">
                    <button className="menu-btn" onClick={() => setShowSidebar(true)}>
                        ☰
                    </button>
                    <div className="status-dot"></div>
                    <span>Alex</span>
                    <button className="new-chat-btn header-new" onClick={startNewChat}>
                        + Neu
                    </button>
                </div>

                <div className="chat-messages" ref={messagesContainerRef}>
                    {isPulling && (
                        <div className="pull-overlay">
                            <div className="pull-card">
                                <h4>Modell wird geladen...</h4>
                                <p>{pullProgress.status}</p>
                                <div className="progress-bar-bg">
                                    <div className="progress-bar-fill" style={{ width: `${pullProgress.percentage}%` }}></div>
                                </div>
                                <span className="progress-text">{pullProgress.percentage}%</span>
                            </div>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.sender}`}>
                            {msg.text}
                        </div>
                    ))}
                </div>

                <div className="chat-input-area">
                    <div className="model-select-wrapper">
                        <span className="model-label">Modell:</span>
                        <select
                            className="model-select"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={isLoadingModels}
                        >
                            {isLoadingModels ? (
                                <option>Lade Modelle...</option>
                            ) : models.length > 0 ? (
                                models.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))
                            ) : (
                                <option>Keine Modelle verfügbar</option>
                            )}
                        </select>
                    </div>
                    <div className="input-row">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Schreibe eine Nachricht..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyPress}
                        />
                        <button className="send-btn" onClick={handleSendMessage}>
                            Senden
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Side: Stream */}
            <div className="stream-panel">
                <div className="overlay-info" style={{ pointerEvents: 'none' }}>Pixel Streaming Live</div>
                <PixelStreamingPlayer ref={psRef} />
            </div>
        </div>
    );
};

export default AvatarChat;
