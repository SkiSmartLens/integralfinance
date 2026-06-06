REVOKE EXECUTE ON FUNCTION public.join_game_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated;