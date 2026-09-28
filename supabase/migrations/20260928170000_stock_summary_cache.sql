-- Persistent second-level cache for the stock-summary edge function.
--
-- The function's in-memory Map only lives as long as one edge instance, so most
-- requests (including Googlebot renders of /stocks/:ticker) were cold and paid
-- 5-7s of AI generation. Rows here are shared across instances.
--
-- Only the edge function touches this table, via the service role. RLS is on
-- with no policies, and anon/authenticated have no grants, so the AI output
-- can't be read or written directly through the public API.
CREATE TABLE IF NOT EXISTS public.stock_summary_cache (
  symbol text NOT NULL,
  mode text NOT NULL,
  -- Bumped in the function whenever the prompt/schema changes; rows from an
  -- older version are treated as misses and overwritten.
  version text NOT NULL,
  body jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, mode)
);

ALTER TABLE public.stock_summary_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.stock_summary_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stock_summary_cache TO service_role;
