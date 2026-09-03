-- =========================================================
-- 1. orders: no client-fabricated fills
-- =========================================================
DROP POLICY IF EXISTS "owner creates orders" ON public.orders;
DROP POLICY IF EXISTS "owner updates orders" ON public.orders;
DROP POLICY IF EXISTS "owner deletes orders" ON public.orders;

-- Owner may only create a *pending* order with no fill data.
CREATE POLICY "owner creates pending orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  public.owns_member(member_id)
  AND status = 'pending'::order_status
  AND filled_price IS NULL
  AND filled_at IS NULL
);

-- No client UPDATE policy at all: only service_role (place-order) fills orders.
CREATE POLICY "no client updates on orders"
ON public.orders AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

-- Cancel is allowed only while still pending.
CREATE POLICY "owner deletes pending orders"
ON public.orders FOR DELETE TO authenticated
USING (public.owns_member(member_id) AND status = 'pending'::order_status);

-- =========================================================
-- 2. positions / transactions stay locked to clients
--    (idempotent re-assertion of the restrictive deny policies)
-- =========================================================
DROP POLICY IF EXISTS "no client inserts on positions" ON public.positions;
DROP POLICY IF EXISTS "no client updates on positions" ON public.positions;
DROP POLICY IF EXISTS "no client deletes on positions" ON public.positions;
CREATE POLICY "no client inserts on positions" ON public.positions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "no client updates on positions" ON public.positions AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no client deletes on positions" ON public.positions AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "no client inserts on transactions" ON public.transactions;
DROP POLICY IF EXISTS "no client updates on transactions" ON public.transactions;
DROP POLICY IF EXISTS "no client deletes on transactions" ON public.transactions;
CREATE POLICY "no client inserts on transactions" ON public.transactions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "no client updates on transactions" ON public.transactions AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no client deletes on transactions" ON public.transactions AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- =========================================================
-- 3. Atomic order fill (fixes the read-then-write cash race)
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_order_fill(
  _member_id uuid,
  _order_id uuid,
  _symbol text,
  _side public.order_side,
  _shares numeric,
  _price numeric,
  _margin_floor numeric DEFAULT 0
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
BEGIN
  IF _shares IS NULL OR _shares <= 0 OR _price IS NULL OR _price <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid fill input');
  END IF;

  -- Serialize concurrent fills for this portfolio.
  SELECT id INTO locked FROM public.game_members WHERE id = _member_id FOR UPDATE;
  IF locked IS NULL THEN
    RETURN jsonb_build_object('error', 'portfolio not found');
  END IF;

  SELECT id, shares, avg_cost INTO pos_id, cur, cur_avg
  FROM public.positions WHERE member_id = _member_id AND symbol = sym FOR UPDATE;
  cur := coalesce(cur, 0);
  cur_avg := coalesce(cur_avg, 0);

  IF _side = 'buy' THEN
    IF cur < 0 THEN RETURN jsonb_build_object('error', 'you have a short position — use COVER'); END IF;
    UPDATE public.game_members SET cash = cash - cost
      WHERE id = _member_id AND cash - cost >= _margin_floor
      RETURNING cash INTO new_cash;
    IF new_cash IS NULL THEN RETURN jsonb_build_object('error', 'insufficient buying power'); END IF;
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

REVOKE ALL ON FUNCTION public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_fill(uuid, uuid, text, public.order_side, numeric, numeric, numeric) TO service_role;

-- =========================================================
-- 4. Per-subject rate limiting for AI / data edge functions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  fn text NOT NULL,
  bucket timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, fn, bucket)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated have no access at all (service_role bypasses RLS).

CREATE INDEX IF NOT EXISTS rate_limits_bucket_idx ON public.rate_limits (bucket);

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  _subject text,
  _fn text,
  _limit integer DEFAULT 20,
  _window_seconds integer DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b timestamptz := to_timestamp(floor(extract(epoch FROM now()) / greatest(_window_seconds, 1)) * greatest(_window_seconds, 1));
  c integer;
BEGIN
  INSERT INTO public.rate_limits (subject, fn, bucket, count)
  VALUES (coalesce(_subject, 'unknown'), _fn, b, 1)
  ON CONFLICT (subject, fn, bucket)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO c;

  -- Opportunistic cleanup of old buckets.
  DELETE FROM public.rate_limits WHERE bucket < now() - interval '1 hour';

  RETURN jsonb_build_object('allowed', c <= _limit, 'count', c, 'limit', _limit,
                            'retry_after', greatest(1, _window_seconds));
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_rate_limit(text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, text, integer, integer) TO service_role;
