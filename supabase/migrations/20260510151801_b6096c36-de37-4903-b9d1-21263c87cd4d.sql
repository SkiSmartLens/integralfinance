GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.owns_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_in_my_game(uuid) TO authenticated, anon;