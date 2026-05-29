import { Link } from "react-router-dom";
import { useLiveNews } from "@/hooks/useLiveNews";
import { NewsItem } from "@/lib/yahoo";

interface Props {
  query: string;
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
  return (
    <a
      href={n.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      {img && (
        <div className={featured ? "aspect-[16/9] overflow-hidden" : "aspect-[16/10] overflow-hidden"}>
          <img
            src={img}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4">
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
              <span
                key={t}
                className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
};

export const NewsList = ({ query }: Props) => {
  const { news, loading } = useLiveNews(query);
  if (loading && !news.length) {
    return <div className="text-muted-foreground py-8 text-center">Loading stories…</div>;
  }
  if (!news.length) {
    return <div className="text-muted-foreground py-8 text-center">No stories found.</div>;
  }
  const [hero, ...rest] = news;
  return (
    <div className="space-y-6">
      <NewsCard n={hero} featured />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rest.map((n) => (
          <NewsCard key={n.uuid} n={n} />
        ))}
      </div>
    </div>
  );
};
