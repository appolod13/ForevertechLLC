-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Gallery Items Table
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  user_name TEXT NOT NULL,
  catalog_name TEXT NOT NULL,
  user_id TEXT,
  device_id TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_quantum_verified BOOLEAN DEFAULT FALSE,
  is_nft BOOLEAN DEFAULT FALSE,
  nft_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gallery_user_id ON gallery_items(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_device_id ON gallery_items(device_id);
CREATE INDEX IF NOT EXISTS idx_gallery_favorite ON gallery_items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON gallery_items(created_at DESC);

-- Orders Table (for checkout/purchases)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  device_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount INTEGER,
  currency TEXT DEFAULT 'usd',
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  gallery_item_id UUID REFERENCES gallery_items(id),
  product_id TEXT,
  variant_id TEXT,
  quantity INTEGER DEFAULT 1,
  price INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Allow anyone to read gallery items (but we'll filter by user in the app)
CREATE POLICY "Anyone can read gallery items" 
  ON gallery_items 
  FOR SELECT 
  USING (true);

-- Allow inserting gallery items (we'll handle user checks in the app)
CREATE POLICY "Anyone can insert gallery items" 
  ON gallery_items 
  FOR INSERT 
  WITH CHECK (true);

-- Allow updating gallery items (for toggling favorites, etc.)
CREATE POLICY "Anyone can update gallery items" 
  ON gallery_items 
  FOR UPDATE 
  USING (true);

-- Allow anyone to read orders (we'll filter by user in the app)
CREATE POLICY "Anyone can read orders" 
  ON orders 
  FOR SELECT 
  USING (true);

-- Allow inserting orders
CREATE POLICY "Anyone can insert orders" 
  ON orders 
  FOR INSERT 
  WITH CHECK (true);

-- Allow updating orders
CREATE POLICY "Anyone can update orders" 
  ON orders 
  FOR UPDATE 
  USING (true);

-- Allow anyone to read order items
CREATE POLICY "Anyone can read order items" 
  ON order_items 
  FOR SELECT 
  USING (true);

-- Allow inserting order items
CREATE POLICY "Anyone can insert order items" 
  ON order_items 
  FOR INSERT 
  WITH CHECK (true);
