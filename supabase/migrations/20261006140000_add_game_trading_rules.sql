-- Classic trading-game rules: a floor on tradable share price (no penny
-- stocks) and a cap on how much of the portfolio one symbol can eat.
-- Both are nullable — null means "no restriction", matching every other
-- optional game rule (duration_days, ends_at).
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS min_price numeric;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS max_position_pct numeric;

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_min_price_check;
ALTER TABLE public.games ADD CONSTRAINT games_min_price_check
  CHECK (min_price IS NULL OR min_price >= 0);

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_max_position_pct_check;
ALTER TABLE public.games ADD CONSTRAINT games_max_position_pct_check
  CHECK (max_position_pct IS NULL OR (max_position_pct > 0 AND max_position_pct <= 100));
