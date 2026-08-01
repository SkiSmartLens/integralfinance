import beginnerBasics from "@/assets/blog/beginner-basics.jpg";
import investingBasics from "@/assets/blog/investing-basics.jpg";
import marketEducation from "@/assets/blog/market-education.jpg";
import stockResearch from "@/assets/blog/stock-research.jpg";
import technicalAnalysis from "@/assets/blog/technical-analysis.jpg";
import riskManagement from "@/assets/blog/risk-management.jpg";
import wealthBuilding from "@/assets/blog/wealth-building.jpg";
import marketPsychology from "@/assets/blog/market-psychology.jpg";
import financialLiteracy from "@/assets/blog/financial-literacy.jpg";
import platform from "@/assets/blog/platform.jpg";

import type { BlogPost } from "./blog";

interface FeaturedImage {
  src: string;
  /** Descriptive alt text for the illustration itself. */
  alt: string;
}

const BY_CATEGORY: Record<string, FeaturedImage> = {
  "Beginner Basics": {
    src: beginnerBasics,
    alt: "Illustration of a gold coin dropping beside a rising bar chart, representing a first investment",
  },
  "Investing Basics": {
    src: investingBasics,
    alt: "Illustration of a basket holding several coloured blocks, representing a fund that holds many companies",
  },
  "Market Education": {
    src: marketEducation,
    alt: "Illustration of a stock exchange building with a bull weathervane and a wavy market line",
  },
  "Stock Research": {
    src: stockResearch,
    alt: "Illustration of a magnifying glass held over a company report with simple bar charts",
  },
  "Technical Analysis": {
    src: technicalAnalysis,
    alt: "Illustration of a candlestick price chart with a rising trendline drawn underneath it",
  },
  "Risk Management": {
    src: riskManagement,
    alt: "Illustration of an umbrella and shield covering a chart, representing protecting a portfolio from losses",
  },
  "Wealth Building": {
    src: wealthBuilding,
    alt: "Illustration of a seedling growing into a plant on top of stacked coins, representing compound growth",
  },
  "Market Psychology": {
    src: marketPsychology,
    alt: "Illustration of a head silhouette with a volatile market line inside it, representing investor emotion",
  },
  "Financial Literacy": {
    src: financialLiteracy,
    alt: "Illustration of a piggy bank next to a budgeting envelope, representing saving before investing",
  },
  "Platform Story": {
    src: platform,
    alt: "Illustration of a laptop showing a simple green price chart and a play button",
  },
  "Platform Education": {
    src: platform,
    alt: "Illustration of a laptop showing a simple green price chart and a play button",
  },
};

const FALLBACK = BY_CATEGORY["Beginner Basics"];

/** Featured image + alt text for a post, chosen by its category. */
export function featuredImage(post: Pick<BlogPost, "category" | "title">): FeaturedImage {
  const base = (post.category && BY_CATEGORY[post.category]) || FALLBACK;
  return { src: base.src, alt: `${base.alt} — illustration for “${post.title}”` };
}
