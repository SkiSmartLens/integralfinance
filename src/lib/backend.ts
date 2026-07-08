import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const env = import.meta.env as Record<string, string | undefined>;

const normalizeUrl = (value?: string) => {
  if (!value) return undefined;
  return value.startsWith("http") ? value : `https://${value}`;
};

const BACKEND_URL =
  normalizeUrl(env.VITE_SUPABASE_URL) ??
  normalizeUrl(env.VITE_SUPABASE_HOST) ??
  (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ??
  "https://oadtpipsbeqiadoluxnq.supabase.co";

const BACKEND_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZHRwaXBzYmVxaWFkb2x1eG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDUyNDYsImV4cCI6MjA5MzU4MTI0Nn0.k7_W04vpl9Sctg1XhNlSz9abWI--VPk82jD5r-0hFvk";

function isNewApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createBackendFetch(publishableKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewApiKey(publishableKey) && headers.get("Authorization") === `Bearer ${publishableKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", publishableKey);
    return fetch(input, { ...init, headers });
  };
}

export const supabase = createClient<Database>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
  global: {
    fetch: createBackendFetch(BACKEND_PUBLISHABLE_KEY),
  },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
