import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, Newspaper } from "lucide-react";
import { fetchNews, NewsItem } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://oadtpipsbeqiadoluxnq.supabase.co";
const ANON =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZHRwaXBzYmVxaWFkb2x1eG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDUyNDYsImV4cCI6MjA5MzU4MTI0Nn0.k7_W04vpl9Sctg1XhNlSz9abWI--VPk82jD5r-0hFvk";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const seedMsg: Msg = {
  role: "assistant",
  content: "Hi 👋 I'm Integral, your market sidekick. Ask me about a stock, the macro picture, news, or how an option works.",
};

export const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([seedMsg]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stories, setStories] = useState<NewsItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-refresh top stories every 45s
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const n = await fetchNews("stock market");
        if (alive) setStories(n.slice(0, 6));
      } catch { /* ignore */ }
    };
    load();
    const t = window.setInterval(load, 45000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
        },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 402) {
        setMessages((p) => {
          const copy = [...p];
          copy[copy.length - 1] = { role: "assistant", content: "AI credits are exhausted. Please add credits to keep chatting." };
          return copy;
        });
        return;
      }
      if (!res.ok || !res.body) {
        setMessages((p) => {
          const copy = [...p];
          copy[copy.length - 1] = { role: "assistant", content: "Sorry, I had trouble responding. Try again in a sec." };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((p) => {
                const copy = [...p];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { role: "assistant", content: "Network error. Try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
          aria-label="Open AI assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,400px)] h-[min(80vh,600px)] bg-card border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <div className="font-bold text-sm leading-tight">Integral AI</div>
                <div className="text-[10px] text-muted-foreground">Markets · live news · ideas</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </header>

          {stories.length > 0 && (
            <div className="border-b max-h-32 overflow-y-auto bg-muted/20">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Newspaper className="w-3 h-3" /> Latest stories · auto-updating
              </div>
              <ul className="divide-y">
                {stories.map((s) => (
                  <li key={s.uuid} className="px-3 py-1.5">
                    <button
                      onClick={() => send(`Summarize this story for me and tell me what it means for markets: "${s.title}"`)}
                      className="text-left text-xs leading-snug hover:text-primary line-clamp-2 w-full"
                      title={s.title}
                    >
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2"
                    : "mr-auto text-foreground"
                )}
              >
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="border-t p-2 flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about a stock, news, or concept…"
              rows={1}
              className="flex-1 resize-none bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary max-h-24"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
