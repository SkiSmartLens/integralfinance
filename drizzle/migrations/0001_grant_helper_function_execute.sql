GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.member_in_my_game(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated, service_role;