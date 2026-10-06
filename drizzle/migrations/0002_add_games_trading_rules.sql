ALTER TABLE public.games ADD COLUMN IF NOT EXISTS min_price numeric;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS max_position_pct numeric;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_max_position_pct_range') THEN
    ALTER TABLE public.games ADD CONSTRAINT games_max_position_pct_range CHECK (max_position_pct IS NULL OR (max_position_pct > 0 AND max_position_pct <= 100));
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';