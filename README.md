<div align="center">
  <img src="./assets/watermarked_img_3713894434454857761.jpg" alt="IGRIS Voice Banner" width="100%" />
</div>

# 🎙️ IGRIS Voice

> **A minimal, responsive voice-and-text AI workspace featuring streaming chat, browser speech input, and secure server-side Azure OpenAI integration.**

IGRIS Voice provides a clean chat interface where conversations happen in real-time. It's built for speed and privacy—conversations live entirely in your page memory and wipe clean the moment you start a new chat or reload.

---

## ✨ Features

*   **⚡ Streaming Chat:** Get incremental, real-time AI responses via SSE (Server-Sent Events).
*   **🎤 Voice Input:** Built-in browser speech-to-text dictation (no third-party audio API required).
*   **🔒 Secure by Design:** Server-side Azure OpenAI integration ensures your API keys never leak to the client.
*   **🧪 Local Preview Mode:** Test the UI immediately without an Azure account using the built-in mock responder.
*   **🛑 Full Control:** Cancel generating responses mid-stream or clear the workspace instantly.

---

## 📋 Requirements

*   **Node.js** 20.9 or later
*   **Yarn 1** (Classic)
*   *(Optional)* An **Azure OpenAI** resource with a deployed chat model supporting streaming completions for live AI responses.

---

## 🚀 Quick Start

Run these commands from the repository root to get the app running locally:

```powershell
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 
*Note: Without Azure credentials, the app defaults to **Local preview** mode and returns a demo response so you can test the UI right away.*

---

## ☁️ Enable Live Azure OpenAI Responses

To connect the app to a real AI model, set up your Azure credentials:

1. Create an Azure OpenAI resource and deploy a chat model with streaming chat completions enabled.
2. Copy `projects/igris-voice/.env.example` to `projects/igris-voice/.env.local`.
3. Configure your `.env.local` file with your specific Azure details:

```dotenv
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-server-side-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-10-21
```
*Use the exact endpoint and deployment name shown in your Azure AI Foundry.*

4. Restart your development server. The status badge at the top-right will switch from **Local preview** to **Azure OpenAI**.

> ⚠️ **Security Warning:** All three Azure values are required. The API key is strictly read by the Next.js server. **Never** expose it as a `NEXT_PUBLIC_` variable, embed it in client code, or commit it to version control.

---

## 🎮 How to Use

*   **Chat:** Type a prompt and hit **Enter** (or the send button). Need a line break? Use **Shift + Enter**.
*   **Dictate:** Click **Voice** to dictate your prompt directly into the input field. *(Note: This uses your browser's native speech recognition. Microphone access usually requires `localhost` or HTTPS).*
*   **Interrupt:** Click **Stop** at any time to halt a generating response.
*   **Reset:** Click **New chat** to clear your current, unsaved conversation and start fresh.

---

## 🛠️ Build and Deploy

IGRIS Voice relies on Next.js server routes for chat handling and provider health checks. It must be deployed to a Node.js environment that supports Next.js route handlers and streaming responses (it cannot be exported as a static-only site).

```powershell
yarn build
yarn start
```

**Production Checklist:**
*   Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` in your hosting provider's environment variables.
*   Do not upload your `.env.local` file. Keep the Azure key secure in your host's secret manager.
*   The app listens on port `3000` by default.

---

## ✅ Validate

Ensure your code is clean and ready for production:

```powershell
yarn typecheck
yarn build
```

---

## 🗺️ Current Scope

**What's inside:** Validated chat requests, Azure OpenAI streaming over SSE, visible provider status and error handling, cancelable generation requests, optional browser speech recognition, and a fallback local preview mode.
