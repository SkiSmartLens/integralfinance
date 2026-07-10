CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_game_member(_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_members
    WHERE game_id = _game_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.member_in_my_game(_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_members m
    WHERE m.id = _member_id
      AND EXISTS (
        SELECT 1
        FROM public.game_members me
        WHERE me.game_id = m.game_id
          AND me.user_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_member(_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_members
    WHERE id = _member_id
      AND user_id = auth.uid()
  );
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_game_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.member_in_my_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_member(uuid) TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.is_game_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.member_in_my_game(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.owns_member(uuid) TO service_role;

DROP POLICY IF EXISTS "games readable to members or public" ON public.games;
CREATE POLICY "games readable to members or public"
ON public.games
FOR SELECT
TO authenticated
USING (is_public OR created_by = auth.uid() OR private.is_game_member(id));

DROP POLICY IF EXISTS "members readable to fellow members" ON public.game_members;
CREATE POLICY "members readable to fellow members"
ON public.game_members
FOR SELECT
TO authenticated
USING (private.is_game_member(game_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "orders visible to owner" ON public.orders;
CREATE POLICY "orders visible to owner"
ON public.orders
FOR SELECT
TO authenticated
USING (private.owns_member(member_id));

DROP POLICY IF EXISTS "owner creates orders" ON public.orders;
CREATE POLICY "owner creates orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (private.owns_member(member_id));

DROP POLICY IF EXISTS "owner deletes orders" ON public.orders;
CREATE POLICY "owner deletes orders"
ON public.orders
FOR DELETE
TO authenticated
USING (private.owns_member(member_id));

DROP POLICY IF EXISTS "owner updates orders" ON public.orders;
CREATE POLICY "owner updates orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (private.owns_member(member_id))
WITH CHECK (private.owns_member(member_id));

DROP POLICY IF EXISTS "positions visible to game" ON public.positions;
CREATE POLICY "positions visible to game"
ON public.positions
FOR SELECT
TO authenticated
USING (private.member_in_my_game(member_id));

DROP POLICY IF EXISTS "tx visible to game" ON public.transactions;
CREATE POLICY "tx visible to game"
ON public.transactions
FOR SELECT
TO authenticated
USING (private.member_in_my_game(member_id));

REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.member_in_my_game(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.owns_member(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.join_game_by_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO service_role;