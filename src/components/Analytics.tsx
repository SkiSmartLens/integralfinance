import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = "G-ZTX36M3HEY";

/**
 * Sends a Google Analytics page_view on every client-side route change.
 * The gtag.js snippet itself lives in index.html and covers the initial load.
 */
export const Analytics = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: `${pathname}${search}`,
      page_location: window.location.href,
      page_title: document.title,
      send_to: MEASUREMENT_ID,
    });
  }, [pathname, search]);

  return null;
};
