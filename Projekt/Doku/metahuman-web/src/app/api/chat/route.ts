import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { message, model, history } = await req.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Invalid message provided' },
                { status: 400 }
            );
        }

        const API_BASE_URL = 'http://127.0.0.1:8000';
        const MODEL_NAME = model || 'llama3.1:latest';

        // 1. Get Text & Emotion from /chat
        console.log("Sending to Local Chat API:", { model: MODEL_NAME, messageSnippet: message.substring(0, 20) });

        let chatResponseData;
        try {
            const chatResponse = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: history || [],
                    model: MODEL_NAME
                })
            });

            if (!chatResponse.ok) {
                const errText = await chatResponse.text();
                throw new Error(`Chat API error: ${chatResponse.status} - ${errText}`);
            }
            chatResponseData = await chatResponse.json();
            console.log("Chat Response:", chatResponseData);

        } catch (e) {
            console.error("Chat API failed:", e);
            // Fallback if backend is down
            return NextResponse.json({
                text: "Sorry, I can't think straight right now. Is my brain server turned on?",
                emotion: "Sad"
            });
        }

        // 2. Get Audio from Edge TTS (returns MP3)
        let audioBase64 = null;
        if (chatResponseData.text) {
            try {
                console.log("Requesting Edge TTS...");
                const ttsResponse = await fetch(`${API_BASE_URL}/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: chatResponseData.text,
                        language: 'en',
                        emotion: chatResponseData.emotion ? chatResponseData.emotion.toLowerCase() : 'neutral'
                    })
                });

                if (ttsResponse.ok) {
                    const audioBuffer = await ttsResponse.arrayBuffer();
                    if (audioBuffer.byteLength > 0) {
                        audioBase64 = Buffer.from(audioBuffer).toString('base64');
                        console.log(`✅ Received Edge TTS Audio: ${audioBuffer.byteLength} bytes`);
                    }
                } else {
                    console.error("TTS API error:", await ttsResponse.text());
                }
            } catch (audioError) {
                console.error("Failed to generate audio via TTS:", audioError);
            }
        }

        // 3. Return combined response
        return NextResponse.json({
            text: chatResponseData.text,
            emotion: chatResponseData.emotion,
            audio: audioBase64
        });

    } catch (error) {
        console.error('Error in chat route:', error);
        return NextResponse.json(
            { error: 'Failed to communicate with backend services.' },
            { status: 500 }
        );
    }
}
