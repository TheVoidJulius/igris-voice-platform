import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const encoder = new TextEncoder();
const maxMessageLength = 8_000;
const maxHistoryLength = 12;

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function azureSettings() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim().replace(/\/+$/, "");
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();

  if (!endpoint || !apiKey || !deployment) return null;

  return {
    endpoint,
    apiKey,
    deployment,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-10-21",
  };
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxHistoryLength) {
    return null;
  }

  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("role" in item) ||
      !("content" in item)
    ) {
      return null;
    }

    const role = item.role;
    const content = item.content;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > maxMessageLength
    ) {
      return null;
    }
    messages.push({ role, content: content.trim() });
  }

  return messages.at(-1)?.role === "user" ? messages : null;
}

function demoReply() {
  return "Local preview — connect Azure OpenAI to enable live responses.";
}

async function pipeAzureStream(
  enqueue: (event: string, data: unknown) => void,
  signal: AbortSignal,
  messages: ChatMessage[],
  settings: NonNullable<ReturnType<typeof azureSettings>>,
) {
  const url = new URL(
    `/openai/deployments/${encodeURIComponent(settings.deployment)}/chat/completions`,
    `${settings.endpoint}/`,
  );
  url.searchParams.set("api-version", settings.apiVersion);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": settings.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages,
      stream: true,
      temperature: 0.4,
    }),
    signal,
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    console.error("Azure OpenAI request failed:", response.status, response.statusText);
    enqueue("error", {
      message: `Azure OpenAI returned HTTP ${response.status}. Check the server logs and deployment settings.`,
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emitDataLines = (frame: string) => {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed: unknown = JSON.parse(payload);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "choices" in parsed &&
          Array.isArray(parsed.choices)
        ) {
          const firstChoice: unknown = parsed.choices[0];
          if (
            typeof firstChoice === "object" &&
            firstChoice !== null &&
            "delta" in firstChoice &&
            typeof firstChoice.delta === "object" &&
            firstChoice.delta !== null &&
            "content" in firstChoice.delta &&
            typeof firstChoice.delta.content === "string"
          ) {
            enqueue("token", { text: firstChoice.delta.content });
          }
        }
      } catch {
        console.error("Received an invalid event from Azure OpenAI.");
        enqueue("error", { message: "The model provider returned an invalid stream event." });
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      emitDataLines(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }

  if (buffer.trim()) emitDataLines(buffer);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const messages = parseMessages(
    typeof body === "object" && body !== null && "messages" in body
      ? body.messages
      : undefined,
  );
  if (!messages) {
    return errorResponse(
      `Send 1–${maxHistoryLength} user/assistant messages, ending with a non-empty user message of at most ${maxMessageLength} characters.`,
      400,
    );
  }

  const settings = azureSettings();
  const abortController = new AbortController();
  const abortFromRequest = () => abortController.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortFromRequest, { once: true });
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => {
        if (!cancelled && !abortController.signal.aborted) {
          controller.enqueue(sse(event, data));
        }
      };

      try {
        enqueue("meta", { provider: settings ? "azure-openai" : "local-demo" });
        if (settings) {
          await pipeAzureStream(enqueue, abortController.signal, messages, settings);
        } else {
          const reply = demoReply();
          for (const word of reply.match(/\S+\s*/g) ?? []) {
            if (abortController.signal.aborted) break;
            enqueue("token", { text: word });
            await new Promise((resolve) => setTimeout(resolve, 18));
          }
        }
        enqueue("done", { ok: true });
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("IGRIS chat stream failed:", error);
          enqueue("error", { message: "The chat stream failed. Check the server logs." });
        }
      } finally {
        request.signal.removeEventListener("abort", abortFromRequest);
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      abortController.abort();
      request.signal.removeEventListener("abort", abortFromRequest);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
