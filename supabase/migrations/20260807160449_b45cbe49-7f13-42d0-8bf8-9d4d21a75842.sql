ALTER TYPE public.order_side ADD VALUE IF NOT EXISTS 'short';
ALTER TYPE public.order_side ADD VALUE IF NOT EXISTS 'cover';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'market_on_open';