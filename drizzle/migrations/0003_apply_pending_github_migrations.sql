CREATE TABLE IF NOT EXISTS public.stock_summary_cache (
  symbol text NOT NULL,
  mode text NOT NULL,
  version text NOT NULL,
  body jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, mode)
);
REVOKE ALL ON public.stock_summary_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stock_summary_cache TO service_role;
ALTER TABLE public.stock_summary_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_min_price_check') THEN
    ALTER TABLE public.games ADD CONSTRAINT games_min_price_check CHECK (min_price IS NULL OR min_price >= 0);
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
NOTIFY pgrst, 'reload schema';