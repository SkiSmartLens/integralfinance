REVOKE EXECUTE ON FUNCTION private.is_game_member(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.member_in_my_game(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.owns_member(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION private.is_game_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.member_in_my_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_game_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.member_in_my_game(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.owns_member(uuid) TO service_role;