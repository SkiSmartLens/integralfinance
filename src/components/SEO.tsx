import { Helmet } from "react-helmet-async";

const SITE = "https://integralstocks.com";

interface Props {
  title: string;
  description: string;
  path: string;
  image?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

/**
 * Per-route SEO head. Sets title, description, canonical, and og:* tags.
 * Pass `path` starting with "/".
 */
export const SEO = ({ title, description, path, image, jsonLd }: Props) => {
  const url = `${SITE}${path}`;
  const ogImage = image ?? `${SITE}/og-image.png`;
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
