import type { SummarySource } from "@/lib/stockSummary";

/**
 * Renders AI text that contains bracket citations like "[1]" and turns each
 * marker into a link to the real article it came from.
 */
export const CitedText = ({ text, sources }: { text: string; sources?: SummarySource[] }) => {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part);
        if (!m) return <span key={i}>{part}</span>;
        const src = sources?.[Number(m[1]) - 1];
        if (!src?.url) return null;
        return (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={`${src.title} — ${src.publisher}`}
            className="align-super text-[10px] font-bold text-primary hover:underline ml-0.5"
          >
            [{m[1]}]
          </a>
        );
      })}
    </>
  );
};
