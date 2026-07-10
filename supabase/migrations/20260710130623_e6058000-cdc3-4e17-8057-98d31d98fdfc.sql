GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_in_my_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.member_in_my_game(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.owns_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO service_role;