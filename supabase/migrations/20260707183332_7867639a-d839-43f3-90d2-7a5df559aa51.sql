
-- Restrict profile visibility to self + shared game members
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable own or shared game"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.game_members me
    JOIN public.game_members them ON them.game_id = me.game_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = public.profiles.user_id
  )
);

-- Revoke EXECUTE on SECURITY DEFINER helpers that are only used inside RLS/triggers
REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.member_in_my_game(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_game_members_cash() FROM PUBLIC, anon, authenticated;

-- join_game_by_code is an intended RPC for signed-in users only
REVOKE EXECUTE ON FUNCTION public.join_game_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated;
