
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_games_is_public ON public.games(is_public) WHERE is_public = true;

GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.owns_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_in_my_game(uuid) TO authenticated, anon;
