-- ==========================================
-- ADD PASSWORD AUTHENTICATION TO USERS TABLE
-- ==========================================
-- Run this SQL in your Supabase SQL Editor
-- https://dccuvohfpbzswtxoecjj.supabase.co

-- Add password_hash column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Verify the update
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Display success message
SELECT 'Users table updated successfully! Password authentication ready.' AS status;
