REVOKE EXECUTE ON FUNCTION public.join_game_by_code(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO service_role;