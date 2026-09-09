import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Languages, BookOpen, ListChecks, Loader2 } from "lucide-react";

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
  error?: string;
}

// Parses the streamed, delimiter-based response as it grows. While a section's closing marker
// hasn't arrived yet, its content is still shown live (partial), which is what makes the "in
// plain English" panel fill in in real time instead of appearing all at once at the end.
function parseChunk(acc: string): Omit<Result, "sourceUrl" | "error"> {
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
  const [mode, setMode] = useState<"text" | "url">(prefillUrl ? "url" : "text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState(prefillUrl);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = useCallback(async (body: { text?: string; url?: string }) => {
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
      setStreaming(true);
      setResult({ plain: "", glossary: [], keyTakeaways: [], sourceUrl });

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
              setResult((prev) => ({ ...parseChunk(acc), sourceUrl: prev?.sourceUrl }));
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
      run({ url: prefillUrl });
    }
  }, [prefillUrl, run]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(mode === "url" ? { url } : { text });
  };


  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Stock Market Jargon Explained Simply — Free Translator"
        description="Paste any article or term and get stock market jargon explained simply. Learn what 'market cap', P/E, and 'short squeeze' mean in plain English."
        path="/translate"
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
            short glossary of the jargon it swapped out.
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
                <h2 className="flex items-center gap-2 font-bold mb-3"><Languages className="w-4 h-4 text-primary" /> In plain English</h2>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {result.plain}
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
