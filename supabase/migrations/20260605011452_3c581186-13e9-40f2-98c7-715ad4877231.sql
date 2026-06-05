DROP POLICY IF EXISTS "owner inserts tx" ON public.transactions;

DROP POLICY IF EXISTS "owner inserts positions" ON public.positions;
DROP POLICY IF EXISTS "owner updates positions" ON public.positions;
DROP POLICY IF EXISTS "owner deletes positions" ON public.positions;

REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.positions FROM authenticated;

REVOKE UPDATE (cash) ON public.game_members FROM authenticated;