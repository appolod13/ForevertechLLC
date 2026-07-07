CREATE TABLE IF NOT EXISTS design_mockups (
  design_hash TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  prompt TEXT,
  printify_product_id TEXT,
  mockup_front_url TEXT,
  mockup_back_url TEXT,
  mockup_left_url TEXT,
  mockup_right_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_mockups_updated_at ON design_mockups(updated_at DESC);

ALTER TABLE design_mockups ENABLE ROW LEVEL SECURITY;
