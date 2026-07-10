DROP POLICY IF EXISTS "games readable to members or public" ON public.games;
CREATE POLICY "games readable to members or public"
ON public.games
FOR SELECT
TO authenticated
USING (
  is_public
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.game_id = games.id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "members readable to fellow members" ON public.game_members;
CREATE POLICY "members readable to owner"
ON public.game_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders visible to owner" ON public.orders;
CREATE POLICY "orders visible to owner"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = orders.member_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owner creates orders" ON public.orders;
CREATE POLICY "owner creates orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = orders.member_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owner deletes orders" ON public.orders;
CREATE POLICY "owner deletes orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = orders.member_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owner updates orders" ON public.orders;
CREATE POLICY "owner updates orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = orders.member_id
      AND gm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = orders.member_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "positions visible to game" ON public.positions;
CREATE POLICY "positions visible to owner"
ON public.positions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = positions.member_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "tx visible to game" ON public.transactions;
CREATE POLICY "tx visible to owner"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.game_members gm
    WHERE gm.id = transactions.member_id
      AND gm.user_id = auth.uid()
  )
);

DROP FUNCTION IF EXISTS private.is_game_member(uuid);
DROP FUNCTION IF EXISTS private.member_in_my_game(uuid);
DROP FUNCTION IF EXISTS private.owns_member(uuid);

REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.member_in_my_game(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_member(uuid) FROM public, anon, authenticated;