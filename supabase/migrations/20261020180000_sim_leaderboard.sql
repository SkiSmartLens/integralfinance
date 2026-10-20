-- Simulator leaderboard for everyone in a game, not just admins.
--
-- Applied by pasting into Lovable's SQL editor (runs as postgres). Safe to
-- run more than once.
--
-- Players can only read their own game_members, positions and transactions
-- rows (RLS), so the leaderboard showed each non-admin player just
-- themselves. sim_leaderboard(game) returns every player in that game with
-- their name, cash per their trade history, holdings and whether they've
-- made a trade, and only to someone playing in that game (or an admin).
-- Nothing else leaves the database: no user ids and no trade history.

CREATE OR REPLACE FUNCTION public.sim_leaderboard(_game_id uuid)
RETURNS TABLE (
  member_id uuid,
  is_me boolean,
  display_name text,
  cash numeric,
  traded boolean,
  positions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    gm.id,
    gm.user_id = auth.uid(),
    coalesce(p.display_name, 'Player'),
    coalesce(public.sim_ledger_cash(gm.id), gm.cash),
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.member_id = gm.id AND upper(t.symbol) <> '$CASH'
    ),
    coalesce(
      (SELECT jsonb_agg(jsonb_build_object('symbol', pos.symbol, 'shares', pos.shares, 'avg_cost', pos.avg_cost) ORDER BY pos.symbol)
       FROM public.positions pos
       WHERE pos.member_id = gm.id AND pos.shares <> 0),
      '[]'::jsonb
    )
  FROM public.game_members gm
  LEFT JOIN public.profiles p ON p.user_id = gm.user_id
  WHERE gm.game_id = _game_id
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.game_members me WHERE me.game_id = _game_id AND me.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')
    )
$fn$;

REVOKE ALL ON FUNCTION public.sim_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sim_leaderboard(uuid) TO authenticated;

-- Make the new function visible to the API right away.
NOTIFY pgrst, 'reload schema';
