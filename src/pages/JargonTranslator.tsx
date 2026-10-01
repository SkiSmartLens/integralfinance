import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Languages, BookOpen, ListChecks, Loader2, Copy, Check } from "lucide-react";

// Inline **bold** only — the only inline markup the model is asked to use.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-${i++}`}>{m[1]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// The model is told markdown headings/bullets are allowed, but the response is streamed as
// plain text — without this, a literal "**" or "- " shows up in the rendered output instead
// of being formatted. Re-run on the full accumulated text each render, so it self-corrects
// once a markdown marker that was mid-stream (e.g. an unclosed "**") completes.
function renderPlain(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flushPara = () => {
    const joined = para.join(" ").trim();
    if (joined) blocks.push(<p key={`p${key++}`} className="mb-3 last:mb-0">{renderInline(joined, `p${key}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${key++}`} className="list-disc pl-5 mb-3 space-y-1">
          {list.map((item, i) => (
            <li key={i}>{renderInline(item, `li${key}-${i}`)}</li>
          ))}
        </ul>,
      );
    }
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    // The model mostly uses a whole-line "**Section Title**" instead of a real "#" heading —
    // treat a line that's bold start-to-finish as a heading too, not inline text.
    const headingText = line.match(/^#{1,6}\s+(.*)$/)?.[1] ?? line.match(/^\*\*([^*]+)\*\*$/)?.[1];
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (!line) {
      flushPara();
      flushList();
    } else if (headingText != null) {
      flushPara();
      flushList();
      blocks.push(
        <h3 key={`h${key++}`} className="font-bold text-base mt-4 mb-2 first:mt-0">
          {renderInline(headingText, `h${key}`)}
        </h3>,
      );
    } else if (bullet) {
      flushPara();
      list.push(bullet[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

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

interface Result {
  plain: string;
  glossary: { term: string; meaning: string }[];
  keyTakeaways: string[];
  sourceUrl?: string;
  /** Only the headline + summary could be read (e.g. the article is paywalled). */
  partial?: boolean;
  error?: string;
}

// Parses the streamed, delimiter-based response as it grows. While a section's closing marker
// hasn't arrived yet, its content is still shown live (partial), which is what makes the "in
// plain English" panel fill in in real time instead of appearing all at once at the end.
function parseChunk(acc: string): Omit<Result, "sourceUrl" | "partial" | "error"> {
  const plain = (acc.match(/===PLAIN===([\s\S]*?)(?:===GLOSSARY===|$)/)?.[1] ?? "").trim();
  const glossaryRaw = (acc.match(/===GLOSSARY===([\s\S]*?)(?:===TAKEAWAYS===|$)/)?.[1] ?? "").trim();
  const takeawaysRaw = (acc.match(/===TAKEAWAYS===([\s\S]*?)(?:===END===|$)/)?.[1] ?? "").trim();

  const glossary = glossaryRaw
    ? glossaryRaw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .flatMap((line) => {
          const idx = line.indexOf(":");
          if (idx < 0) return [];
          return [{ term: line.slice(0, idx).replace(/^[-*]\s*/, "").trim(), meaning: line.slice(idx + 1).trim() }];
        })
    : [];

  const keyTakeaways = takeawaysRaw
    ? takeawaysRaw
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return { plain, glossary, keyTakeaways };
}

const JargonTranslator = () => {
  const [params] = useSearchParams();
  const prefillUrl = params.get("url") ?? "";
  // Yahoo story ID from a news card, so the backend can read the article directly.
  const prefillUuid = params.get("uuid") ?? undefined;
  const [mode, setMode] = useState<"text" | "url">(prefillUrl ? "url" : "text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState(prefillUrl);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async (body: { text?: string; url?: string; uuid?: string }) => {
    setLoading(true);
    setStreaming(false);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const bearer = session?.access_token ?? ANON;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/jargon-translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${bearer}` },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        let msg = "AI service is temporarily unavailable.";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        setResult({ plain: "", glossary: [], keyTakeaways: [], error: msg });
        return;
      }

      const sourceUrlHeader = res.headers.get("X-Source-Url");
      const sourceUrl = sourceUrlHeader ? decodeURIComponent(sourceUrlHeader) : undefined;
      const partial = res.headers.get("X-Source-Partial") === "1";
      setStreaming(true);
      setResult({ plain: "", glossary: [], keyTakeaways: [], sourceUrl, partial });

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
              setResult((prev) => ({ ...parseChunk(acc), sourceUrl: prev?.sourceUrl, partial: prev?.partial }));
            }
          } catch { /* ignore partial/non-JSON lines */ }
        }
      }
    } catch {
      setResult({ plain: "", glossary: [], keyTakeaways: [], error: "Network error. Try again." });
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, []);

  const autoRan = useRef("");
  useEffect(() => {
    if (prefillUrl && autoRan.current !== prefillUrl) {
      autoRan.current = prefillUrl;
      setMode("url");
      setUrl(prefillUrl);
      run({ url: prefillUrl, uuid: prefillUuid });
    }
  }, [prefillUrl, prefillUuid, run]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // The story ID only applies to the link it came with, not one the user typed.
    await run(mode === "url" ? { url, uuid: url === prefillUrl ? prefillUuid : undefined } : { text });
  };


  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Stock Market Jargon Explained Simply — Free Translator"
        description="Paste any article or term and get stock market jargon explained simply. Learn what 'market cap', P/E, and 'short squeeze' mean in plain English."
        path="/translate"
        keywords="stock market jargon, investing terms explained, what does market cap mean, P/E ratio explained, short squeeze explained, finance dictionary"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "IntegralStocks Jargon Translator",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
        }}
      />
      <Header />
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary mb-2">
            <Languages className="w-4 h-4" /> Jargon Translator
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Turn Wall Street speak into plain English</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Paste any financial article or a link. The AI rewrites it for beginners, keeps every number and fact, and gives you a
            short glossary of the jargon it swapped out. Looking for a specific term instead?{" "}
            <Link to="/learn/glossary" className="text-primary font-semibold hover:underline">
              Browse the full glossary
            </Link>
            .
          </p>
        </header>

        <form onSubmit={submit} className="bg-card border rounded-lg p-4 md:p-6 space-y-4">
          <div className="flex gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`px-3 py-1.5 rounded-full border ${mode === "text" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-transparent"}`}
            >
              Paste text
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-3 py-1.5 rounded-full border ${mode === "url" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-transparent"}`}
            >
              From URL
            </button>
          </div>

          {mode === "text" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste an earnings press release, 10-K excerpt, analyst note, or any dense financial article…"
              className="w-full min-h-[220px] rounded-md border bg-background p-3 text-sm"
              required={mode === "text"}
            />
          ) : (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full rounded-md border bg-background p-3 text-sm"
              required={mode === "url"}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground font-semibold py-2.5 disabled:opacity-60"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {streaming ? "Writing…" : "Reading article…"}</>
              : <><Sparkles className="w-4 h-4" /> Translate</>}
          </button>
        </form>

        {result?.error && (
          <div className="mt-6 bg-muted/40 border rounded-md p-4 text-sm text-muted-foreground">
            {/credit/i.test(result.error) ? "AI credits are temporarily exhausted. Please try again later." :
             /rate limit/i.test(result.error) ? "Too many requests right now. Please try again in a moment." :
             `Couldn’t translate that: ${result.error}`}
          </div>
        )}

        {result && !result.error && (
          <section className="mt-6 space-y-4">
            {result.plain && (
              <article className="bg-card border rounded-lg p-4 md:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="flex items-center gap-2 font-bold"><Languages className="w-4 h-4 text-primary" /> In plain English</h2>
                  {!streaming && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(result.plain);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch { /* clipboard unavailable */ }
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                {result.partial && (
                  <p className="text-xs bg-muted/60 border rounded-md p-2.5 mb-3 text-muted-foreground">
                    Only the headline and summary were available. The full article is behind the publisher’s paywall, so
                    open the source link for the whole story.
                  </p>
                )}
                <div className="max-w-none text-sm leading-relaxed">
                  {renderPlain(result.plain)}
                  {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-middle" />}
                </div>
                {result.sourceUrl && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Source:{" "}
                    <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                      {result.sourceUrl}
                    </a>
                  </p>
                )}
              </article>
            )}
            {result.keyTakeaways.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h2 className="flex items-center gap-2 font-bold mb-2"><ListChecks className="w-4 h-4 text-primary" /> Key takeaways</h2>
                <ul className="text-sm space-y-1.5 list-disc pl-5">
                  {result.keyTakeaways.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}
            {result.glossary.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h2 className="flex items-center gap-2 font-bold mb-2"><BookOpen className="w-4 h-4 text-primary" /> Glossary</h2>
                <dl className="text-sm space-y-2">
                  {result.glossary.map((g, i) => (
                    <div key={i}>
                      <dt className="font-semibold">{g.term}</dt>
                      <dd className="text-muted-foreground">{g.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default JargonTranslator;
