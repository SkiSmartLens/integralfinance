import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/lib/backend";
import { Sparkles, Languages, BookOpen, ListChecks, Loader2 } from "lucide-react";

interface Result {
  plain?: string;
  glossary?: { term: string; meaning: string }[];
  keyTakeaways?: string[];
  sourceUrl?: string;
  error?: string;
}

const JargonTranslator = () => {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const body = mode === "url" ? { url } : { text };
    const { data, error } = await supabase.functions.invoke("jargon-translate", { body });
    if (error) {
      let msg = error.message;
      const ctx = (error as any)?.context as Response | undefined;
      if (ctx?.json) {
        try { const b = await ctx.json(); if (b?.error) msg = b.error; } catch {}
      }
      setResult({ error: msg });
    } else {
      setResult(data as Result);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Jargon Translator — Turn financial articles into plain English | IntegralStocks"
        description="Paste a financial article or URL and the IntegralStocks AI rewrites it in plain English, with a glossary of jargon and key takeaways."
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
              className="w-full min-h-[220px] rounded-md border bg-background p-3 text-sm font-mono"
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
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Translating…</> : <><Sparkles className="w-4 h-4" /> Translate</>}
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
            {result.keyTakeaways && result.keyTakeaways.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h2 className="flex items-center gap-2 font-bold mb-2"><ListChecks className="w-4 h-4 text-primary" /> Key takeaways</h2>
                <ul className="text-sm space-y-1.5 list-disc pl-5">
                  {result.keyTakeaways.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}
            {result.plain && (
              <article className="bg-card border rounded-lg p-4 md:p-6">
                <h2 className="flex items-center gap-2 font-bold mb-3"><Languages className="w-4 h-4 text-primary" /> In plain English</h2>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {result.plain}
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
            {result.glossary && result.glossary.length > 0 && (
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
