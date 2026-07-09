ALTER TABLE public.games ADD COLUMN IF NOT EXISTS leverage numeric NOT NULL DEFAULT 1;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS duration_days integer;