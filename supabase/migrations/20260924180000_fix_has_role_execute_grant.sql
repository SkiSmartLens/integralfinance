-- 20260809132044 revoked EXECUTE on has_role() from PUBLIC, anon and authenticated to stop
-- direct RPC probing of role membership. But has_role() is also called inside SELECT policies
-- on games/game_members/positions/profiles (e.g. "admins read all games"), and Postgres requires
-- the querying role to hold EXECUTE on any function a policy evaluates — regardless of the
-- function being SECURITY DEFINER, which only affects privileges *inside* the function body, not
-- the caller's right to invoke it. With EXECUTE missing, any authenticated user's query that
-- touches those tables' SELECT policies (including an INSERT ... RETURNING via supabase-js's
-- .insert().select(), as when creating a game) fails with "permission denied for function
-- has_role" — not just for admins, for everyone, since RLS evaluates every applicable policy.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
