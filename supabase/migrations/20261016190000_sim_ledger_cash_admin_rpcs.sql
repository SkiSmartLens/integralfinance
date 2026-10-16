-- Simulator: keep stored cash equal to the trade history, plus admin controls.
--
-- Applied by pasting into Lovable's SQL editor (runs as postgres), because
-- edge-function deploys weren't landing. Safe to run more than once.
--
-- 1. enforce_game_members_cash also lets trusted database functions write
--    cash (they set the transaction-local flag app.sim_engine = 'on').
-- 2. sim_ledger_cash(member): cash per the trade history — starting cash,
--    minus buys/covers, plus sells/shorts; shares the history doesn't explain
--    count as bought at their average cost (or the sale price once sold), so
--    they're never free money. Same rules as src/lib/simLedger.ts.
-- 3. Triggers on transactions and positions rewrite game_members.cash to that
--    figure after every change, whichever engine made it. A failed rewrite is
--    logged and skipped — it can never block a trade.
-- 4. admin_* functions for the simulator dev console. Each checks the caller
--    is an admin.
-- 5. Syncs every player's stored cash once, at the end.

-- 1 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_game_members_cash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  claims text := NULLIF(current_setting('request.jwt.claims', true), '');
BEGIN
  IF (claims IS NOT NULL AND claims::json->>'role' = 'service_role')
     OR current_setting('role', true) = 'service_role'
     OR current_setting('app.sim_engine', true) = 'on'
     OR (session_user IN ('postgres', 'supabase_admin') AND claims IS NULL) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT starting_cash INTO NEW.cash FROM public.games WHERE id = NEW.game_id;
    IF NEW.cash IS NULL THEN NEW.cash := 100000; END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cash IS DISTINCT FROM OLD.cash THEN
      RAISE EXCEPTION 'cash can only be modified by the trading engine';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

-- 2 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sim_ledger_cash(_member_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  cash numeric;
  t record;
  p record;
  held numeric;
  missing numeric;
  basis numeric;
  net jsonb := '{}'::jsonb; -- symbol -> net shares per the history
BEGIN
  SELECT g.starting_cash INTO cash
  FROM public.game_members gm JOIN public.games g ON g.id = gm.game_id
  WHERE gm.id = _member_id;
  IF cash IS NULL THEN RETURN NULL; END IF;

  FOR t IN
    SELECT upper(symbol) AS symbol, side::text AS side, shares, price
    FROM public.transactions WHERE member_id = _member_id
    ORDER BY created_at, id
  LOOP
    held := coalesce((net->>t.symbol)::numeric, 0);
    basis := NULL;
    SELECT avg_cost INTO basis FROM public.positions
    WHERE member_id = _member_id AND upper(symbol) = t.symbol LIMIT 1;
    basis := coalesce(basis, t.price);
    -- Shares sold (or covered) that the history never shows bought (or
    -- shorted). "$CASH" rows are admin cash adjustments, not stock, so skip them.
    IF t.symbol <> '$CASH' AND t.side = 'sell' THEN
      missing := t.shares - greatest(held, 0);
      IF missing > 0.000000001 THEN cash := cash - missing * basis; held := held + missing; END IF;
    ELSIF t.symbol <> '$CASH' AND t.side = 'cover' THEN
      missing := t.shares - greatest(-held, 0);
      IF missing > 0.000000001 THEN cash := cash + missing * basis; held := held - missing; END IF;
    END IF;
    IF t.side IN ('buy', 'cover') THEN
      cash := cash - t.price * t.shares;
      held := held + t.shares;
    ELSE
      cash := cash + t.price * t.shares;
      held := held - t.shares;
    END IF;
    net := jsonb_set(net, ARRAY[t.symbol], to_jsonb(held), true);
  END LOOP;

  -- Shares still held that the history doesn't explain (e.g. set by hand).
  FOR p IN SELECT upper(symbol) AS symbol, shares, avg_cost FROM public.positions WHERE member_id = _member_id LOOP
    missing := p.shares - coalesce((net->>p.symbol)::numeric, 0);
    IF abs(missing) > 0.000000001 THEN cash := cash - missing * p.avg_cost; END IF;
  END LOOP;

  RETURN round(cash, 2);
END
$fn$;

-- 3 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sim_sync_cash(_member_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c numeric;
  prev text := current_setting('app.sim_engine', true);
BEGIN
  c := public.sim_ledger_cash(_member_id);
  IF c IS NULL THEN RETURN NULL; END IF;
  BEGIN
    PERFORM set_config('app.sim_engine', 'on', true);
    UPDATE public.game_members SET cash = c WHERE id = _member_id AND cash IS DISTINCT FROM c;
    PERFORM set_config('app.sim_engine', coalesce(prev, ''), true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sim_sync_cash(%) skipped: %', _member_id, SQLERRM;
    PERFORM set_config('app.sim_engine', coalesce(prev, ''), true);
  END;
  RETURN c;
END
$fn$;

CREATE OR REPLACE FUNCTION public.sim_sync_cash_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sim_sync_cash(OLD.member_id);
  ELSE
    PERFORM public.sim_sync_cash(NEW.member_id);
    IF TG_OP = 'UPDATE' AND OLD.member_id IS DISTINCT FROM NEW.member_id THEN
      PERFORM public.sim_sync_cash(OLD.member_id);
    END IF;
  END IF;
  RETURN NULL;
END
$fn$;

DROP TRIGGER IF EXISTS sim_sync_cash_on_transactions ON public.transactions;
CREATE TRIGGER sim_sync_cash_on_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sim_sync_cash_trg();

DROP TRIGGER IF EXISTS sim_sync_cash_on_positions ON public.positions;
CREATE TRIGGER sim_sync_cash_on_positions
AFTER INSERT OR UPDATE OR DELETE ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.sim_sync_cash_trg();

CREATE OR REPLACE FUNCTION public.sim_sync_all_cash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  m record;
  c numeric;
  fixed integer := 0;
BEGIN
  FOR m IN SELECT id, cash FROM public.game_members LOOP
    c := public.sim_sync_cash(m.id);
    IF c IS NOT NULL AND c IS DISTINCT FROM m.cash THEN fixed := fixed + 1; END IF;
  END LOOP;
  RETURN fixed;
END
$fn$;

-- Lets the app know stored cash can be trusted (it's kept in sync above).
CREATE OR REPLACE FUNCTION public.sim_cash_synced()
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$ SELECT true $fn$;

-- 4 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sim_require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
END
$fn$;

-- Adds (positive) or removes (negative) cash via a "$CASH" trade-history row.
CREATE OR REPLACE FUNCTION public.sim_record_cash_adjustment(_member_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF _amount IS NULL OR abs(_amount) < 0.01 THEN RETURN; END IF;
  INSERT INTO public.transactions (member_id, order_id, symbol, side, shares, price, commission)
  VALUES (
    _member_id, NULL, '$CASH',
    (CASE WHEN _amount > 0 THEN 'sell' ELSE 'buy' END)::public.order_side,
    1, round(abs(_amount), 2), 0
  );
END
$fn$;

-- One admin fill (buy, sell or cover) at _price, with no buying-power limit.
-- Same position/average-cost rules as the trading engine; it records a filled
-- order and a trade-history row, and the sync triggers then move the cash.
CREATE OR REPLACE FUNCTION public.sim_fill(_member_id uuid, _symbol text, _side public.order_side, _shares numeric, _price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  pos_id uuid;
  cur numeric;
  cur_avg numeric;
  new_shares numeric;
  ord_id uuid;
BEGIN
  SELECT id, shares, avg_cost INTO pos_id, cur, cur_avg
  FROM public.positions WHERE member_id = _member_id AND symbol = _symbol FOR UPDATE;
  cur := coalesce(cur, 0);
  cur_avg := coalesce(cur_avg, 0);

  IF _side = 'buy' THEN
    IF cur < 0 THEN RAISE EXCEPTION 'They are short %; cover it first', _symbol; END IF;
    new_shares := cur + _shares;
    IF pos_id IS NULL THEN
      INSERT INTO public.positions (member_id, symbol, shares, avg_cost) VALUES (_member_id, _symbol, new_shares, _price);
    ELSE
      UPDATE public.positions SET shares = new_shares, avg_cost = (cur * cur_avg + _shares * _price) / new_shares WHERE id = pos_id;
    END IF;
  ELSIF _side = 'sell' THEN
    IF cur < _shares THEN RAISE EXCEPTION 'They only hold % shares of %', cur, _symbol; END IF;
    new_shares := cur - _shares;
    IF new_shares = 0 THEN DELETE FROM public.positions WHERE id = pos_id;
    ELSE UPDATE public.positions SET shares = new_shares WHERE id = pos_id; END IF;
  ELSIF _side = 'cover' THEN
    IF -cur < _shares THEN RAISE EXCEPTION 'They are only short % shares of %', -cur, _symbol; END IF;
    new_shares := cur + _shares;
    IF new_shares = 0 THEN DELETE FROM public.positions WHERE id = pos_id;
    ELSE UPDATE public.positions SET shares = new_shares WHERE id = pos_id; END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported side %', _side;
  END IF;

  INSERT INTO public.orders (member_id, symbol, side, order_type, shares, after_hours, status, filled_price, filled_at)
  VALUES (_member_id, _symbol, _side, 'market', _shares, false, 'filled', _price, now())
  RETURNING id INTO ord_id;
  INSERT INTO public.transactions (member_id, order_id, symbol, side, shares, price, commission)
  VALUES (_member_id, ord_id, _symbol, _side, _shares, _price, 0);
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_set_cash(_member_id uuid, _cash numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  cur numeric;
BEGIN
  PERFORM public.sim_require_admin();
  IF _cash IS NULL THEN RAISE EXCEPTION 'Cash must be a number'; END IF;
  cur := public.sim_ledger_cash(_member_id);
  IF cur IS NULL THEN RAISE EXCEPTION 'Player not found'; END IF;
  PERFORM public.sim_record_cash_adjustment(_member_id, _cash - cur);
  RETURN public.sim_sync_cash(_member_id);
END
$fn$;

-- _holdings_value: the player's stocks at live prices (the database has no prices).
CREATE OR REPLACE FUNCTION public.admin_set_net_worth(_member_id uuid, _net_worth numeric, _holdings_value numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  cur numeric;
BEGIN
  PERFORM public.sim_require_admin();
  IF _net_worth IS NULL OR _holdings_value IS NULL THEN RAISE EXCEPTION 'Net worth must be a number'; END IF;
  cur := public.sim_ledger_cash(_member_id);
  IF cur IS NULL THEN RAISE EXCEPTION 'Player not found'; END IF;
  PERFORM public.sim_record_cash_adjustment(_member_id, _net_worth - (cur + _holdings_value));
  RETURN public.sim_sync_cash(_member_id);
END
$fn$;

-- Sets a player's total shares of one stock. _charge: pay with their cash at
-- _price like a real trade (net worth unchanged); false = free (net worth moves).
CREATE OR REPLACE FUNCTION public.admin_set_position(
  _member_id uuid, _symbol text, _shares numeric, _price numeric, _charge boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  sym text := upper(trim(coalesce(_symbol, '')));
  cur numeric;
  moved numeric := 0;
BEGIN
  PERFORM public.sim_require_admin();
  IF sym !~ '^[A-Z0-9.^=-]{1,15}$' THEN RAISE EXCEPTION 'Enter a valid ticker symbol'; END IF;
  IF _shares IS NULL OR _shares < 0 THEN RAISE EXCEPTION 'Shares must be zero or more'; END IF;
  IF _price IS NULL OR _price <= 0 THEN RAISE EXCEPTION 'No live price for %', sym; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_members WHERE id = _member_id) THEN RAISE EXCEPTION 'Player not found'; END IF;

  SELECT shares INTO cur FROM public.positions WHERE member_id = _member_id AND symbol = sym;
  cur := coalesce(cur, 0);
  IF cur < 0 THEN
    PERFORM public.sim_fill(_member_id, sym, 'cover', -cur, _price);
    moved := moved + cur * _price;
    cur := 0;
  END IF;
  IF _shares > cur THEN
    PERFORM public.sim_fill(_member_id, sym, 'buy', _shares - cur, _price);
    moved := moved - (_shares - cur) * _price;
  ELSIF _shares < cur THEN
    PERFORM public.sim_fill(_member_id, sym, 'sell', cur - _shares, _price);
    moved := moved + (cur - _shares) * _price;
  END IF;
  IF NOT coalesce(_charge, true) THEN
    PERFORM public.sim_record_cash_adjustment(_member_id, -moved);
  END IF;
  PERFORM public.sim_sync_cash(_member_id);
  RETURN jsonb_build_object('symbol', sym, 'shares', _shares, 'price', _price);
END
$fn$;

CREATE OR REPLACE FUNCTION public.sim_clear_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  DELETE FROM public.positions WHERE member_id = _member_id;
  DELETE FROM public.transactions WHERE member_id = _member_id;
  DELETE FROM public.orders WHERE member_id = _member_id;
  IF to_regclass('public.portfolio_snapshots') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.portfolio_snapshots WHERE member_id = $1' USING _member_id;
  END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_reset_member(_member_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.sim_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.game_members WHERE id = _member_id) THEN RAISE EXCEPTION 'Player not found'; END IF;
  PERFORM public.sim_clear_member(_member_id);
  RETURN public.sim_sync_cash(_member_id);
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_remove_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.sim_require_admin();
  PERFORM public.sim_clear_member(_member_id);
  DELETE FROM public.game_members WHERE id = _member_id;
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_update_game(_game_id uuid, _changes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v numeric;
BEGIN
  PERFORM public.sim_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = _game_id) THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF _changes ? 'name' AND length(trim(coalesce(_changes->>'name', ''))) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Game name must be 1-60 characters';
  END IF;
  IF _changes ? 'starting_cash' THEN
    v := NULLIF(_changes->>'starting_cash', '')::numeric;
    IF v IS NULL OR v <= 0 OR v > 1000000000 THEN RAISE EXCEPTION 'Starting cash must be between $1 and $1,000,000,000'; END IF;
  END IF;
  IF _changes ? 'leverage' THEN
    v := NULLIF(_changes->>'leverage', '')::numeric;
    IF v IS NULL OR v < 1 OR v > 10 THEN RAISE EXCEPTION 'Leverage must be between 1x and 10x'; END IF;
  END IF;
  IF _changes ? 'min_price' THEN
    v := NULLIF(_changes->>'min_price', '')::numeric;
    IF v IS NOT NULL AND v < 0 THEN RAISE EXCEPTION 'Minimum price must be $0 or more'; END IF;
  END IF;
  IF _changes ? 'max_position_pct' THEN
    v := NULLIF(_changes->>'max_position_pct', '')::numeric;
    IF v IS NOT NULL AND (v <= 0 OR v > 100) THEN RAISE EXCEPTION 'Max position must be between 1%% and 100%%'; END IF;
  END IF;

  UPDATE public.games SET
    name = CASE WHEN _changes ? 'name' THEN trim(_changes->>'name') ELSE name END,
    starting_cash = CASE WHEN _changes ? 'starting_cash' THEN (_changes->>'starting_cash')::numeric ELSE starting_cash END,
    leverage = CASE WHEN _changes ? 'leverage' THEN (_changes->>'leverage')::numeric ELSE leverage END,
    allow_short = CASE WHEN _changes ? 'allow_short' THEN (_changes->>'allow_short')::boolean ELSE allow_short END,
    is_public = CASE WHEN _changes ? 'is_public' THEN (_changes->>'is_public')::boolean ELSE is_public END,
    min_price = CASE WHEN _changes ? 'min_price' THEN NULLIF(_changes->>'min_price', '')::numeric ELSE min_price END,
    max_position_pct = CASE WHEN _changes ? 'max_position_pct' THEN NULLIF(_changes->>'max_position_pct', '')::numeric ELSE max_position_pct END,
    ends_at = CASE WHEN _changes ? 'ends_at' THEN NULLIF(_changes->>'ends_at', '')::timestamptz ELSE ends_at END
  WHERE id = _game_id;

  -- A new starting cash shifts everyone's trade-history cash.
  IF _changes ? 'starting_cash' THEN
    PERFORM public.sim_sync_cash(id) FROM public.game_members WHERE game_id = _game_id;
  END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_delete_game(_game_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  m record;
  n integer := 0;
BEGIN
  PERFORM public.sim_require_admin();
  FOR m IN SELECT id FROM public.game_members WHERE game_id = _game_id LOOP
    PERFORM public.sim_clear_member(m.id);
    n := n + 1;
  END LOOP;
  DELETE FROM public.game_members WHERE game_id = _game_id;
  DELETE FROM public.games WHERE id = _game_id;
  RETURN n;
END
$fn$;

CREATE OR REPLACE FUNCTION public.admin_sync_all_cash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.sim_require_admin();
  RETURN public.sim_sync_all_cash();
END
$fn$;

-- Permissions: internal helpers are callable only by other database
-- functions; admin_* by signed-in users (each re-checks for admin).
REVOKE ALL ON FUNCTION public.sim_ledger_cash(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_sync_cash(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_sync_cash_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_sync_all_cash() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_require_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_record_cash_adjustment(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_fill(uuid, text, public.order_side, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sim_clear_member(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_set_cash(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_net_worth(uuid, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_position(uuid, text, numeric, numeric, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_game(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_game(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_sync_all_cash() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_cash(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_net_worth(uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_position(uuid, text, numeric, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_game(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_all_cash() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sim_cash_synced() TO anon, authenticated;

-- Make the new functions visible to the API right away.
NOTIFY pgrst, 'reload schema';

-- 5 ---------------------------------------------------------------------------
SELECT public.sim_sync_all_cash() AS balances_fixed;
