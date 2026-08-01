import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useLiveNews } from "@/hooks/useLiveNews";
import { NewsItem } from "@/lib/yahoo";

interface Props {
  /** One search query, or several that get merged + deduped. */
  query: string | string[];
  /** Optional related-blog link shown under the news grid. */
  blogLinkLabel?: string;
}

function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const NewsCard = ({ n, featured = false }: { n: NewsItem; featured?: boolean }) => {
  const img = n.thumbnail?.resolutions?.[0]?.url;
  const alt = `Thumbnail for news story: ${n.title}`;
  const navigate = useNavigate();
  return (
    <div className="group bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <a href={n.link} target="_blank" rel="noopener noreferrer" className="block">
        {img && (
          <div className={featured ? "aspect-[16/9] overflow-hidden" : "aspect-[16/10] overflow-hidden"}>
            <img
              src={img}
              alt={alt}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="p-4 pb-0">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <span className="font-semibold text-primary">{n.publisher}</span>
            <span>·</span>
            <span>{timeAgo(n.providerPublishTime)}</span>
          </div>
          <h3
            className={`font-semibold leading-snug group-hover:text-primary transition-colors ${
              featured ? "text-2xl" : "text-base"
            }`}
          >
            {n.title}
          </h3>
          {n.relatedTickers && n.relatedTickers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {n.relatedTickers.slice(0, 4).map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </a>
      <div className="p-4 pt-3 mt-auto">
        <button
          type="button"
          onClick={() => navigate(`/translate?url=${encodeURIComponent(n.link)}`)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-accent/60 px-3 py-2 text-xs font-extrabold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Summarize
        </button>
      </div>
    </div>
  );
};


// Broaden the window a bit: keep stories from ~5 minutes ago up to ~2 days old.
const MIN_AGE_SEC = 60 * 5;
const MAX_AGE_SEC = 60 * 60 * 48;

export const NewsList = ({ query, blogLinkLabel = "Read the blog" }: Props) => {
  const { news, loading } = useLiveNews(query);
  const [visible, setVisible] = useState(9);

  const nowSec = Math.floor(Date.now() / 1000);
  const filtered = news.filter((n) => {
    const age = nowSec - (n.providerPublishTime ?? nowSec);
    return age >= MIN_AGE_SEC && age <= MAX_AGE_SEC;
  });
  // Fallback: if the freshness window is empty, show whatever we have.
  const list = filtered.length ? filtered : news;

  if (loading && !list.length) {
    return <div className="text-muted-foreground py-8 text-center">Loading stories…</div>;
  }
  if (!list.length) {
    return <div className="text-muted-foreground py-8 text-center">No stories found.</div>;
  }
  const shown = list.slice(0, visible);
  const [hero, ...rest] = shown;
  const hasMore = list.length > visible;

  return (
    <div className="space-y-6">
      <NewsCard n={hero} featured />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rest.map((n) => (
          <NewsCard key={n.uuid} n={n} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisible((v) => v + 9)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary text-primary font-extrabold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Show more stories <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex justify-center pt-4 border-t">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
        >
          <BookOpen className="w-4 h-4" /> {blogLinkLabel}
        </Link>
      </div>
    </div>
  );
};
