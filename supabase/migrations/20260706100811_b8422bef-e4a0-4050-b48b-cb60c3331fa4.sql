-- Defence-in-depth: block all client-side writes to trading-engine tables.
-- Service role bypasses RLS, so the trading engine is unaffected.

-- game_members: deny any UPDATE from client roles (cash also guarded by trigger)
CREATE POLICY "no client updates on game_members"
ON public.game_members
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- positions: deny INSERT/UPDATE/DELETE from client roles
CREATE POLICY "no client inserts on positions"
ON public.positions
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "no client updates on positions"
ON public.positions
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "no client deletes on positions"
ON public.positions
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);

-- transactions: deny INSERT/UPDATE/DELETE from client roles
CREATE POLICY "no client inserts on transactions"
ON public.transactions
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "no client updates on transactions"
ON public.transactions
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "no client deletes on transactions"
ON public.transactions
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);