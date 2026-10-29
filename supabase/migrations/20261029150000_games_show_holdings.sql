-- Simulator: the game's creator chooses whether players can see each other's
-- stocks on the leaderboard. On by default, which is how every game worked
-- before this setting existed.
--
-- Applied by pasting into Lovable's SQL editor (runs as postgres). Safe to
-- run more than once.
--
-- This only controls what the page shows. sim_leaderboard still returns every
-- player's holdings to everyone in the game, since the page prices them live
-- to rank players by net worth.

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS show_holdings boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
