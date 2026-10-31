ALTER TABLE public.games ADD COLUMN IF NOT EXISTS show_holdings boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';