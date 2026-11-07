# IGRIS Voice

IGRIS Voice is a responsive AI chat workspace designed for text-first conversations and optional browser-based speech input. It streams replies from Azure OpenAI, keeps provider credentials on the server, and offers an explicitly labeled local preview when no provider is configured.

## Features

- Minimal chat interface with streaming replies and response cancellation.
- Azure OpenAI chat completions streamed to the browser over Server-Sent Events.
- Server-side validation of request messages and visible provider/API errors.
- Optional speech-to-text through the browser's Web Speech API.
- Local preview mode that does not make model requests.
- No saved conversation history; chats remain in browser memory until cleared or reloaded.

## Requirements

- Node.js 20.9 or later
- Yarn 1 (Classic)
- For live responses, an Azure OpenAI resource and a deployed chat model that supports streaming chat completions

## Start in local preview

From the repository root:

```powershell
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). If Azure credentials are not configured, the provider indicator says **Local preview**. The app returns a short demo response; it does not call an AI model.

## Connect Azure OpenAI

1. Create an Azure OpenAI resource and deploy a chat model that supports streaming chat completions.
2. Copy this project's example file to `.env.local`:

   ```powershell
   Copy-Item projects/igris-voice/.env.example projects/igris-voice/.env.local
   ```

3. Edit `projects/igris-voice/.env.local`:

   ```dotenv
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-server-side-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-10-21
   ```

   Set the endpoint from your Azure resource, the API key from its server-side credentials, and the exact model deployment name. The API version defaults to `2024-10-21` when omitted; use a version supported by your Azure resource.
4. Restart the dev server. The status in the upper-right should show **Azure OpenAI** and the configured deployment name.
5. Send a prompt. If the status remains **Local preview**, verify all three required settings are present and restart the server. If Azure returns an HTTP error, check the server terminal and confirm the endpoint, key, deployment name, API version, and resource access.

`AZURE_OPENAI_API_KEY` is consumed only by the Next.js server. Do not prefix it with `NEXT_PUBLIC_`, put it in browser code, commit `.env.local`, or expose it in a client-side deployment setting.

## Use voice input

Select **Voice** in the composer and speak; the recognized text is added to the prompt for you to review and send. This is speech-to-text input only—IGRIS does not currently handle live audio conversations or speak responses aloud. Recognition support depends on the browser and operating system. Microphone access generally requires `localhost` or an HTTPS origin.

## Production build and hosting

The chat and health endpoints are Next.js server routes, and chat uses streaming responses. Use a Node.js host that supports Next.js route handlers and response streaming; do not deploy as a static export.

```powershell
yarn build
yarn start
```

The app listens on port `3000` by default. Configure `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` as server-side environment variables in the host's secret manager before starting it. Set `AZURE_OPENAI_API_VERSION` only if you need to override the default. Do not upload `.env.local` or publish the API key.

## Project structure

- `src/app/page.tsx` — chat interface, browser speech input, and SSE client.
- `src/app/api/chat/route.ts` — request validation, local demo response, and Azure OpenAI stream adapter.
- `src/app/api/health/route.ts` — reports whether the required Azure settings are present.
- `src/app/globals.css` — workspace styling and reduced-motion behavior.

## Current limitations

- Conversations are not persisted or associated with user accounts.
- Voice input relies on browser speech recognition; no audio is sent to a server-side speech service.
- There is no text-to-speech, real-time voice gateway, retrieval, model registry, or provider routing yet.

These are planned areas, not features currently available in the app.
