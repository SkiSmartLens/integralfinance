import { Helmet } from "react-helmet-async";

const SITE = "https://integralstocks.com";

/** Encode a path for use in canonical/og URLs (ticker slugs like "^gspc" contain `^`, which isn't URL-safe). */
export const canonicalPath = (path: string) => path.replace(/\^/g, "%5E");

interface Props {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string | string[];
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** "article" for blog posts; defaults to "website". */
  type?: "website" | "article";
  /** Keep the page out of search results (404s, personal pages). */
  noindex?: boolean;
}

/**
 * Per-route SEO head. Sets title, description, canonical, and og:* tags.
 * Pass `path` starting with "/".
 */
export const SEO = ({ title, description, path, image, keywords, jsonLd, type = "website", noindex }: Props) => {
  const url = `${SITE}${canonicalPath(path)}`;
  const ogImage = image ?? `${SITE}/stocks-hero.jpg`;
  const ld = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const keywordsContent = Array.isArray(keywords) ? keywords.join(", ") : keywords;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywordsContent ? <meta name="keywords" content={keywordsContent} /> : null}
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
};
