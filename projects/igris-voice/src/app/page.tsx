"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ProviderStatus = {
  provider: "azure-openai" | "local-demo";
  deployment: string | null;
};

type StreamEvent =
  | { type: "meta"; provider: ProviderStatus["provider"] }
  | { type: "token"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

const starters = [
  "Untangle a problem",
  "Explain a concept",
  "Sketch an idea",
];

function blackHoleFrame(time: number) {
  const glyphs = " .,:-=+*#%@";
  const width = 88;
  const height = 24;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const rows: string[] = [];

  for (let y = 0; y < height; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      const dx = (x - centerX) / (height * 0.86);
      const dy = (y - centerY) / (height * 0.48);
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const diskRadius = Math.hypot(dx, dy * 2.65 - dx * 0.18);
      const ringRadius = 1.55 + Math.sin(angle * 2 - time * 0.7) * 0.035;
      const ring = Math.exp(-Math.pow((diskRadius - ringRadius) / 0.16, 2));
      const spiral = Math.max(
        0,
        Math.sin(diskRadius * 25 - angle * 2.8 - time * 1.35),
      );
      const hotSide = 0.3 + 0.7 * ((Math.cos(angle - 0.7) + 1) / 2);
      const lensGlow =
        0.36 * Math.exp(-Math.pow((radius - 0.34) / 0.075, 2));
      const outerGlow =
        0.2 * Math.exp(-Math.pow((diskRadius - 1.79) / 0.2, 2));
      const jetWidth = 0.035 + Math.abs(dy) * 0.018;
      const jet = Math.abs(dx) < jetWidth && Math.abs(dy) > 0.64
        ? 0.2 * (1 - Math.min(1, (Math.abs(dy) - 0.64) / 0.4))
        : 0;
      const grain =
        (Math.sin(x * 2.2 + y * 4.7 + time * 1.4) +
          Math.sin(x * 0.7 - y * 1.3 - time * 0.9) +
          2) *
        0.035;
      const intensity = Math.min(
        1,
        ring * hotSide * (0.7 + spiral * 0.3) + lensGlow + outerGlow + jet + grain,
      );
      const inShadow = radius < 0.235;
      const glyphIndex = Math.min(
        glyphs.length - 1,
        Math.floor(intensity * (glyphs.length - 1)),
      );
      row += inShadow || intensity < 0.075 ? " " : glyphs[glyphIndex];
    }
    rows.push(row);
  }

  return rows.join("\n");
}

function BlackHoleField() {
  const fieldRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (reducedMotion.matches || document.hidden) return;
      timer = window.setInterval(() => {
        field.textContent = blackHoleFrame(performance.now() / 1000);
      }, 120);
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    reducedMotion.addEventListener("change", start);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      reducedMotion.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="black-hole-field" aria-hidden="true">
      <span className="singularity-label">IGRIS / EVENT HORIZON</span>
      <pre ref={fieldRef} className="ascii-black-hole">{blackHoleFrame(0)}</pre>
    </div>
  );
}

function readEvent(frame: string): StreamEvent | null {
  const eventName = frame
    .split("\n")
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const data = frame
    .split("\n")
    .find((line) => line.startsWith("data:"))
    ?.slice(5)
    .trim();
  if (!eventName || !data) return null;

  try {
    const payload: unknown = JSON.parse(data);
    if (typeof payload !== "object" || payload === null) return null;
    if (eventName === "meta" && "provider" in payload) {
      const provider = payload.provider;
      if (provider === "azure-openai" || provider === "local-demo") {
        return { type: "meta", provider };
      }
    }
    if (eventName === "token" && "text" in payload && typeof payload.text === "string") {
      return { type: "token", text: payload.text };
    }
    if (eventName === "error" && "message" in payload && typeof payload.message === "string") {
      return { type: "error", message: payload.message };
    }
    if (eventName === "done") return { type: "done" };
  } catch {
    return null;
  }
  return null;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<ProviderStatus["provider"]>("local-demo");
  const [deployment, setDeployment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Health check failed (${response.status}).`);
        return (await response.json()) as ProviderStatus;
      })
      .then((health) => {
        setProvider(health.provider);
        setDeployment(health.deployment);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not check provider status.");
      });

    return () => {
      recognitionRef.current?.stop();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("prompt")?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = useCallback(
    async (prompt: string) => {
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt || busy) return;

      const nextMessages = [...messages, { role: "user" as const, content: cleanPrompt }];
      setMessages([...nextMessages, { role: "assistant", content: "" }]);
      setInput("");
      setError("");
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: nextMessages.slice(-12) }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || `Chat request failed (${response.status}).`);
        }
        if (!response.body) throw new Error("The server did not return a readable response stream.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError = "";
        const handleFrame = (frame: string) => {
          const event = readEvent(frame);
          if (!event) return;
          if (event.type === "meta") setProvider(event.provider);
          if (event.type === "token") {
            setMessages((current) => {
              const updated = [...current];
              const last = updated.at(-1);
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.text,
                };
              }
              return updated;
            });
          }
          if (event.type === "error") streamError = event.message;
        };

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            handleFrame(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");
          }
          if (done) break;
        }
        if (buffer.trim()) handleFrame(buffer);
        if (streamError) throw new Error(streamError);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "The chat request failed.");
          setMessages((current) => {
            const last = current.at(-1);
            if (last?.role === "assistant" && !last.content) return current.slice(0, -1);
            return current;
          });
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const startVoiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || busy) return;

    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      setInput(transcript);
    };
    recognition.onerror = (event) => {
      setError(`Voice input stopped: ${event.error}.`);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    setError("");
    recognition.start();
  };

  const stop = () => {
    abortRef.current?.abort();
    recognitionRef.current?.stop();
    setListening(false);
  };

  const clearConversation = () => {
    if (busy) return;
    setMessages([]);
    setError("");
    setInput("");
    recognitionRef.current?.stop();
    setListening(false);
  };

  const providerName = provider === "azure-openai" ? "Azure OpenAI" : "Local preview";

  return (
    <main className="workspace">
      <section className="main-panel">
        <header className="topbar" aria-label="Workspace controls">
          <a className="brand" href="/" aria-label="IGRIS Voice home">
            <span className="brand-mark">IGRIS<span>.</span></span>
            <span className="brand-caption">VOICE / TEXT</span>
          </a>
          <div className="topbar-right">
            <div className={`provider-pill ${provider === "azure-openai" ? "connected" : ""}`}>
              <span className="provider-dot" />
              <span>{providerName}</span>
              {deployment && <span className="deployment-name">{deployment}</span>}
            </div>
            {messages.length > 0 && (
              <button
                className="new-chat-button"
                type="button"
                onClick={clearConversation}
                disabled={busy}
              >
                New chat
              </button>
            )}
          </div>
        </header>

        <section className="conversation" aria-label="Conversation">
          <BlackHoleField />
          <div className="conversation-inner">
            {messages.length === 0 ? (
              <>
                <section className="welcome" aria-labelledby="welcome-title">
                  <h1 id="welcome-title">What’s on your mind?</h1>
                </section>
                <div className="starter-grid" aria-label="Start with an example">
                  {starters.map((starter) => (
                    <button className="starter" type="button" key={starter} onClick={() => void send(starter)}>
                      {starter}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="thread">
                {messages.map((message, index) => (
                  <article className={`message ${message.role}`} key={`${index}-${message.role}`}>
                    <div className="message-avatar" aria-hidden="true">
                      {message.role === "assistant" ? "I" : "P"}
                    </div>
                    <div className="message-body">
                      <div className="message-label">
                        {message.role === "assistant" ? "IGRIS" : "YOU"}
                      </div>
                      <p>
                        {message.content ||
                          (busy && index === messages.length - 1 ? (
                            <span className="typing" aria-label="IGRIS is responding">
                              <i /><i /><i />
                            </span>
                          ) : null)}
                      </p>
                    </div>
                  </article>
                ))}
                <div ref={endRef} />
              </div>
            )}

            {error && <div className="error-banner" role="alert">{error}</div>}

            <div className="composer-stage">
              <p className="composer-hint">Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line</p>
              <form
                className="composer"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void send(input);
                }}
              >
                <label className="sr-only" htmlFor="prompt">Message IGRIS</label>
                <textarea
                  id="prompt"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="Write or speak..."
                  rows={2}
                  maxLength={8_000}
                  disabled={busy}
                />
                <div className="composer-bottom">
                  <div className="composer-tools">
                    <button
                      className={`tool-button ${listening ? "listening" : ""}`}
                      type="button"
                      onClick={listening ? stop : startVoiceInput}
                      disabled={!speechSupported || busy}
                      aria-label={listening ? "Stop voice input" : speechSupported ? "Start voice input" : "Voice input is not supported in this browser"}
                      title={speechSupported ? "Browser speech recognition" : "Speech recognition is not supported in this browser"}
                    >
                      <span aria-hidden="true">{listening ? "■" : "◉"}</span>
                      <span>{listening ? "Listening" : "Voice"}</span>
                    </button>
                    {listening && <span className="voice-caption">Listening in this browser</span>}
                  </div>
                  {busy ? (
                    <button className="send-button stop-button" type="button" onClick={stop} aria-label="Stop response">■ <span>Stop</span></button>
                  ) : (
                    <button className="send-button" type="submit" disabled={!input.trim()} aria-label="Send message">↑ <span>Send</span></button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
