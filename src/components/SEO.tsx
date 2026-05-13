import { Helmet } from "react-helmet-async";

const SITE = "https://integralstocks.lovable.app";

interface Props {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

/**
 * Per-route SEO head. Sets title, description, canonical, and og:* tags.
 * Pass `path` starting with "/".
 */
export const SEO = ({ title, description, path, jsonLd }: Props) => {
  const url = `${SITE}${path}`;
  const ld = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
};
