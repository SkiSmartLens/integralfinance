-- Lock down direct writes to game_members.cash from clients.
-- Cash is only ever changed by the trading engine (service role).
DROP POLICY IF EXISTS "users update own membership" ON public.game_members;
REVOKE UPDATE ON public.game_members FROM authenticated;

-- Defense-in-depth: explicit deny-by-default has no policies for INSERT/UPDATE/DELETE
-- on positions and transactions, and grants are already revoked. Re-assert revokes.
REVOKE INSERT, UPDATE, DELETE ON public.positions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM authenticated, anon;