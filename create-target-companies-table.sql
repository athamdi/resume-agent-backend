-- Quick fix: Create missing target_companies table
-- Copy and paste this into your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS target_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_target_companies_user_id ON target_companies(user_id);

-- Enable RLS
ALTER TABLE target_companies ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all for service role" ON target_companies
  FOR ALL USING (true);

-- Verify
SELECT * FROM target_companies LIMIT 1;
