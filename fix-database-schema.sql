-- Fix database schema issues

-- Add experience_level column to cv_data if missing
ALTER TABLE cv_data ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Verify cv_data table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cv_data'
AND table_schema = 'public'
ORDER BY ordinal_position;
