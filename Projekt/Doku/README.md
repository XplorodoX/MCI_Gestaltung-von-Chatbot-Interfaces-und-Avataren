# HMI2 - MetaHuman Web Interface

This project integrates an Unreal Engine 5 MetaHuman with a Next.js web application, allowing for real-time interaction via Pixel Streaming and an LLM-powered chat interface.

## Prerequisites

-   **Node.js** (v18 or later)
-   **Unreal Engine 5.0+**
-   **Ollama** (for local LLM support)

## Installation (Web App)

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd HMI2/metahuman-web
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    The app will be available at [http://localhost:3000](http://localhost:3000).

## LLM Setup (Ollama)

1.  Install [Ollama](https://ollama.com/).
2.  Pull the model used in the app (default `llama3.1`):
    ```bash
    ollama pull llama3.1
    ```
3.  Start the Ollama server:
    ```bash
    ollama serve
    ```