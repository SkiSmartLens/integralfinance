import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Send, Sparkles, Newspaper, Zap } from "lucide-react";
import { fetchNews, NewsItem } from "@/lib/yahoo";
import { cn } from "@/lib/utils";
import { dispatchAction, AppAction } from "@/lib/actions";
import { useWidgets } from "@/lib/widgets";
import { useWatchlist } from "@/hooks/useWatchlist";
import { supabase } from "@/lib/backend";

const env = import.meta.env as Record<string, string | undefined>;
const normalizeUrl = (value?: string) => {
  if (!value) return undefined;
  return value.startsWith("http") ? value : `https://${value}`;
};
const SUPABASE_URL =
  normalizeUrl(env.VITE_SUPABASE_URL) ??
  normalizeUrl(env.VITE_SUPABASE_HOST) ??
  (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ??
  "https://oadtpipsbeqiadoluxnq.supabase.co";
const ANON =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZHRwaXBzYmVxaWFkb2x1eG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDUyNDYsImV4cCI6MjA5MzU4MTI0Nn0.k7_W04vpl9Sctg1XhNlSz9abWI--VPk82jD5r-0hFvk";

interface Msg { role: "user" | "assistant"; content: string }

const seedMsg: Msg = {
  role: "assistant",
  content:
    "Hi 👋 I'm Integral. I can answer market questions **and drive the app for you**.\n\nTry: *“Take me to the screener”*, *“Show Tesla”*, *“Switch to crypto”*, *“Add Top Losers to my dashboard”*, *“Reorder widgets so sectors is first”*.",
};

const ACTION_RE = /<<<ACTIONS>>>([\s\S]*?)<<<END>>>/;

function stripActions(text: string) {
  return text.replace(ACTION_RE, "").trim();
}

function extractActions(text: string): AppAction[] {
  const m = text.match(ACTION_RE);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1].trim());
    if (!Array.isArray(arr)) return [];
    return arr
      .map((a) => (a && typeof a === "object" && typeof a.type === "string"
        ? { ...(a.payload || {}), type: a.type } as AppAction
        : null))
      .filter(Boolean) as AppAction[];
  } catch {
    return [];
  }
}

const QUICK_PROMPTS = [
  "Take me to top losers",
  "Add Top Losers widget",
  "Show me NVDA",
  "Switch to crypto",
  "Open the trading simulator",
];

export const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([seedMsg]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stories, setStories] = useState<NewsItem[]>([]);
  const [lastActions, setLastActions] = useState<AppAction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ranActionsRef = useRef<Set<number>>(new Set());

  const navigate = useNavigate();
  const location = useLocation();
  const { order: widgetOrder } = useWidgets();
  const { symbols: watchlist } = useWatchlist();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const n = await fetchNews("stock market"); if (alive) setStories(n.slice(0, 6)); } catch {}
    };
    load();
    const t = window.setInterval(load, 45000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      setOpen(true);
      if (detail?.prompt) setTimeout(() => send(detail.prompt!), 50);
    };
    window.addEventListener("integral-ai-open", onOpen);
    return () => window.removeEventListener("integral-ai-open", onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const executeActions = (actions: AppAction[]) => {
    for (const a of actions) {
      try {
        if (a.type === "navigate" && a.path) navigate(a.path);
        else dispatchAction(a);
      } catch (e) {
        console.warn("action failed", a, e);
      }
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    setLastActions([]);
    const userMsg: Msg = { role: "user", content };
    const next: Msg[] = [...messages, userMsg, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);
    const assistantIndex = next.length - 1;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages((prev) => {
          const cp = [...prev];
          cp[assistantIndex] = { role: "assistant", content: "Please sign in to chat with Integral." };
          return cp;
        });
        setStreaming(false);
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          context: {
            path: location.pathname,
            symbol: new URLSearchParams(location.search).get("symbol") || undefined,
            widgets: widgetOrder,
            watchlist,
          },
        }),
      });

      if (res.status === 402) {
        setMessages((p) => { const c = [...p]; c[assistantIndex] = { role: "assistant", content: "AI credits are exhausted." }; return c; });
        return;
      }
      if (!res.ok || !res.body) {
        setMessages((p) => { const c = [...p]; c[assistantIndex] = { role: "assistant", content: "Sorry, I had trouble responding." }; return c; });
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
              setMessages((p) => { const c = [...p]; c[assistantIndex] = { role: "assistant", content: stripActions(acc) }; return c; });
            }
          } catch {}
        }
      }

      // Run actions once full message arrived
      if (!ranActionsRef.current.has(assistantIndex)) {
        ranActionsRef.current.add(assistantIndex);
        const actions = extractActions(acc);
        if (actions.length) {
          setLastActions(actions);
          executeActions(actions);
        }
      }
    } catch {
      setMessages((p) => { const c = [...p]; c[assistantIndex] = { role: "assistant", content: "Network error. Try again." }; return c; });
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
        <div className="fixed bottom-5 right-5 z-50 w-[min(94vw,420px)] h-[min(82vh,640px)] bg-card border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <div className="font-bold text-sm leading-tight">Integral AI · Guide</div>
                <div className="text-[10px] text-muted-foreground">Ask me to navigate, customize, or explain</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </header>

          {stories.length > 0 && (
            <div className="border-b max-h-28 overflow-y-auto bg-muted/20">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Newspaper className="w-3 h-3" /> Latest stories
              </div>
              <ul className="divide-y">
                {stories.slice(0, 4).map((s) => (
                  <li key={s.uuid} className="px-3 py-1.5">
                    <button
                      onClick={() => send(`Summarize this story and tell me what it means for markets: "${s.title}"`)}
                      className="text-left text-xs leading-snug hover:text-primary line-clamp-2 w-full"
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
                  "max-w-[88%] text-sm whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2"
                    : "mr-auto text-foreground"
                )}
              >
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
            {lastActions.length > 0 && (
              <div className="mr-auto max-w-[88%] text-[11px] bg-accent/40 border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 flex-wrap">
                <Zap className="w-3 h-3 text-primary" />
                <span className="font-semibold">Done:</span>
                {lastActions.map((a, i) => (
                  <span key={i} className="font-mono">
                    {a.type}{" "}
                    {a.type === "navigate" ? a.path
                      : a.type === "selectSymbol" ? a.symbol
                      : a.type === "setCategory" ? a.id
                      : a.type === "addWidget" || a.type === "removeWidget" ? a.id
                      : a.type === "addToWatchlist" || a.type === "removeFromWatchlist" ? a.symbol
                      : ""}{i < lastActions.length - 1 ? "," : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="px-2 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={streaming}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-accent disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t p-2 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Integral to take you somewhere…"
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
