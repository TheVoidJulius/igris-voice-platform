# IGRIS Voice Platform

IGRIS Voice is a voice-and-text AI workspace with streaming chat, optional browser speech input, and a server-side Azure OpenAI integration.

## IGRIS Voice

IGRIS Voice is a responsive chat application with a minimal workspace UI, incremental responses, optional browser speech-to-text, and a server-side Azure OpenAI integration. Conversations are kept in page memory only and are cleared when you start a new chat or reload.

### Requirements

- Node.js 20.9 or later
- Yarn 1 (Classic)
- For live responses: an Azure OpenAI resource and a deployed chat model that supports streaming chat completions

### Install and run

Run these commands from the repository root:

```powershell
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). Without Azure settings, the app clearly indicates **Local preview** and returns a demo response; it does not call an AI model.

### Enable live Azure OpenAI responses

1. Create an Azure OpenAI resource and deploy a chat model with streaming chat completions enabled.
2. Copy `projects/igris-voice/.env.example` to `projects/igris-voice/.env.local`.
3. Set the values in `.env.local`:

   ```dotenv
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-server-side-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-10-21
   ```

   Use the endpoint shown for your Azure resource and the exact deployment name shown in Azure AI Foundry. The API version may be changed to one supported by your resource.
4. Restart the development server and confirm the status at the top-right changes from **Local preview** to **Azure OpenAI**.

All three required Azure values must be present. The key is read only by the Next.js server and must never be added to client code, committed to Git, or exposed as a `NEXT_PUBLIC_` variable. For a hosted deployment, configure these values as server-side environment variables in the hosting provider rather than uploading `.env.local`.

### Use the app

- Type a prompt and press **Enter** or the send button. Use **Shift + Enter** for a new line.
- Select **Voice** to dictate into the prompt field when the browser supports speech recognition. This is browser speech-to-text input, not a live audio conversation. Browser support varies; microphone access generally requires `localhost` or HTTPS.
- Select **Stop** to cancel a response. Select **New chat** to clear the current, unsaved conversation.

### Build and host

IGRIS Voice uses Next.js server routes for chat and provider health, so deploy it to a Node.js host that supports Next.js route handlers and streaming responses; it is not a static-only site.

```powershell
yarn build
yarn start
```

Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` in the hosting environment before starting the server. The app listens on port `3000` by default. Keep the Azure key server-side and use the host's secret manager.

### Validate

```powershell
yarn typecheck
yarn build
```

## Current scope and planned work

**Implemented:** validated chat requests, Azure OpenAI streaming over SSE, visible provider status and errors, cancelable requests, optional browser speech recognition, and a local preview mode.

**Not implemented yet:** saved/authenticated conversations, server-side audio or WebSocket voice, text-to-speech, retrieval and citations, provider routing, and model comparison. These are future goals, not available features.
