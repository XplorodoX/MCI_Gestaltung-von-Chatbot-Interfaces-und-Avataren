import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const OLLAMA_URL = 'http://127.0.0.1:11434/api/tags';

        const response = await fetch(OLLAMA_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract model names from the response
        const models = data.models?.map((model: { name: string }) => model.name) || [];

        return NextResponse.json({ models });

    } catch (error) {
        console.error('Error fetching Ollama models:', error);
        return NextResponse.json(
            { error: 'Failed to fetch models from Ollama', models: [] },
            { status: 500 }
        );
    }
}
export async function POST(req: Request) {
    try {
        const { model } = await req.json();
        if (!model) {
            return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
        }

        const OLLAMA_PULL_URL = 'http://127.0.0.1:11434/api/pull';

        const response = await fetch(OLLAMA_PULL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model, stream: true }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        // Stream the response from Ollama to the client
        const stream = new ReadableStream({
            async start(controller) {
                if (!response.body) return;
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        controller.enqueue(new TextEncoder().encode(chunk));
                    }
                } catch (error) {
                    controller.error(error);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('Error pulling Ollama model:', error);
        return NextResponse.json(
            { error: 'Failed to pull model from Ollama' },
            { status: 500 }
        );
    }
}
