ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS printify_order_id TEXT,
  ADD COLUMN IF NOT EXISTS printify_status TEXT,
  ADD COLUMN IF NOT EXISTS shipping_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country TEXT,
  ADD COLUMN IF NOT EXISTS shipping_region TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address1 TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address2 TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_zip TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfillment_error TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_printify_order_id ON orders(printify_order_id);
