-- Simulator: leverage borrows against your net worth, like a margin account.
--
-- Applied by pasting into Lovable's SQL editor (runs as postgres). Safe to
-- run more than once.
--
-- Since 20261020190000 a buy could cost at most leverage × your current cash,
-- so a player whose cash was already invested couldn't borrow at all. Now, in
-- a game with leverage L, the stocks you own may be worth up to L × your net
-- worth: a buy may take cash down to −(L − 1) × net worth. 2× with $100k all
-- in cash buys $200k; with $100k already in stocks it buys another $100k.
--
-- Net worth needs live prices, which the database doesn't have, so
-- place-order works it out and passes the floor as the new _buy_floor
-- argument. Called without it (admin-set-cash, or place-order before it's
-- redeployed), buys keep the previous leverage × cash rule. Covers, shorts,
-- sells and the admin "no limit" floor (-1e15) are unchanged. Same rule as
-- buyLimit in src/lib/simLedger.ts.
--
-- Adding an argument makes a new function, so the old one is dropped first;
-- otherwise calls with the old arguments couldn't choose between the two.

DROP FUNCTION IF EXISTS public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.apply_order_fill(
  _member_id uuid,
  _order_id uuid,
  _symbol text,
  _side public.order_side,
  _shares numeric,
  _price numeric,
  _margin_floor numeric DEFAULT 0,
  _buy_floor numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cost numeric := _price * _shares;
  sym text := upper(_symbol);
  pos_id uuid;
  cur numeric := 0;
  cur_avg numeric := 0;
  new_shares numeric;
  new_avg numeric;
  new_cash numeric;
  abs_old numeric;
  abs_new numeric;
  locked uuid;
  cur_cash numeric;
  lev numeric;
  buy_floor numeric;
BEGIN
  IF _shares IS NULL OR _shares <= 0 OR _price IS NULL OR _price <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid fill input');
  END IF;

  -- Serialize concurrent fills for this portfolio.
  SELECT id INTO locked FROM public.game_members WHERE id = _member_id FOR UPDATE;
  IF locked IS NULL THEN
    RETURN jsonb_build_object('error', 'portfolio not found');
  END IF;

  SELECT gm.cash, greatest(coalesce(g.leverage, 1), 1) INTO cur_cash, lev
  FROM public.game_members gm JOIN public.games g ON g.id = gm.game_id
  WHERE gm.id = _member_id;
  lev := coalesce(lev, 1);

  SELECT id, shares, avg_cost INTO pos_id, cur, cur_avg
  FROM public.positions WHERE member_id = _member_id AND symbol = sym FOR UPDATE;
  cur := coalesce(cur, 0);
  cur_avg := coalesce(cur_avg, 0);

  IF _side = 'buy' THEN
    IF cur < 0 THEN RETURN jsonb_build_object('error', 'you have a short position — use COVER'); END IF;
    -- place-order passes _buy_floor = −(leverage − 1) × net worth at live
    -- prices, so stocks owned can reach leverage × net worth. Without it (an
    -- older caller), the previous rule: cost ≤ leverage × cash.
    buy_floor := CASE
      WHEN _margin_floor <= -1e14 THEN _margin_floor
      WHEN _buy_floor IS NOT NULL THEN _buy_floor
      ELSE -(lev - 1) * greatest(coalesce(cur_cash, 0), 0)
    END;
    UPDATE public.game_members SET cash = cash - cost
      WHERE id = _member_id AND cash - cost >= buy_floor
      RETURNING cash INTO new_cash;
    IF new_cash IS NULL THEN
      RETURN jsonb_build_object('error', format(
        'Not enough buying power: you can spend up to $%s right now.',
        to_char(greatest(coalesce(cur_cash, 0) - buy_floor, 0), 'FM999,999,999,990.00')
      ));
    END IF;
    new_shares := cur + _shares;
    new_avg := CASE WHEN cur > 0 THEN (cur * cur_avg + cost) / new_shares ELSE _price END;
    IF pos_id IS NULL THEN
      INSERT INTO public.positions (member_id, symbol, shares, avg_cost) VALUES (_member_id, sym, new_shares, new_avg);
    ELSE
      UPDATE public.positions SET shares = new_shares, avg_cost = new_avg WHERE id = pos_id;
    END IF;

  ELSIF _side = 'sell' THEN
    IF cur <= 0 OR cur < _shares THEN RETURN jsonb_build_object('error', 'insufficient shares'); END IF;
    new_shares := cur - _shares;
    IF new_shares = 0 THEN DELETE FROM public.positions WHERE id = pos_id;
    ELSE UPDATE public.positions SET shares = new_shares WHERE id = pos_id; END IF;
    UPDATE public.game_members SET cash = cash + cost WHERE id = _member_id RETURNING cash INTO new_cash;

  ELSIF _side = 'short' THEN
    IF cur > 0 THEN RETURN jsonb_build_object('error', 'you have a long position — SELL first'); END IF;
    new_shares := cur - _shares;
    abs_old := abs(cur);
    abs_new := abs(new_shares);
    new_avg := CASE WHEN abs_old > 0 THEN (abs_old * cur_avg + _shares * _price) / abs_new ELSE _price END;
    IF pos_id IS NULL THEN
      INSERT INTO public.positions (member_id, symbol, shares, avg_cost) VALUES (_member_id, sym, -_shares, _price);
    ELSE
      UPDATE public.positions SET shares = new_shares, avg_cost = new_avg WHERE id = pos_id;
    END IF;
    UPDATE public.game_members SET cash = cash + cost WHERE id = _member_id RETURNING cash INTO new_cash;

  ELSIF _side = 'cover' THEN
    IF cur >= 0 THEN RETURN jsonb_build_object('error', 'no short position to cover'); END IF;
    IF abs(cur) < _shares THEN RETURN jsonb_build_object('error', 'cover size exceeds short'); END IF;
    UPDATE public.game_members SET cash = cash - cost
      WHERE id = _member_id AND cash - cost >= _margin_floor
      RETURNING cash INTO new_cash;
    IF new_cash IS NULL THEN RETURN jsonb_build_object('error', 'insufficient buying power to cover'); END IF;
    new_shares := cur + _shares;
    IF new_shares = 0 THEN DELETE FROM public.positions WHERE id = pos_id;
    ELSE UPDATE public.positions SET shares = new_shares WHERE id = pos_id; END IF;

  ELSE
    RETURN jsonb_build_object('error', 'invalid side');
  END IF;

  UPDATE public.orders
    SET status = 'filled', filled_price = _price, filled_at = now()
    WHERE id = _order_id;

  INSERT INTO public.transactions (member_id, order_id, symbol, side, shares, price, commission)
  VALUES (_member_id, _order_id, sym, _side, _shares, _price, 0);

  RETURN jsonb_build_object('filled', true, 'price', _price, 'cash', new_cash);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric, numeric) TO service_role;
NOTIFY pgrst, 'reload schema';
