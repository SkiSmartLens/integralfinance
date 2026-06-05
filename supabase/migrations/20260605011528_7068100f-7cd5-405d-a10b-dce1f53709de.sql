REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.member_in_my_game(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.owns_member(uuid) FROM anon, authenticated, public;