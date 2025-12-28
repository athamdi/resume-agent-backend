# Database Schema

Run these SQL commands in your Supabase SQL Editor to create all required tables.

## Create Tables

```sql
-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CV Data table
CREATE TABLE IF NOT EXISTS cv_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  skills JSONB,
  education JSONB,
  experience JSONB,
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  application_url TEXT,
  location TEXT,
  job_type TEXT,
  is_remote BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  applied_at TIMESTAMP WITH TIME ZONE,
  cover_letter TEXT,
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Application Queue table
CREATE TABLE IF NOT EXISTS application_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Target Companies table
CREATE TABLE IF NOT EXISTS target_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cv_data_user_id ON cv_data(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_application_queue_user_id ON application_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_application_queue_status ON application_queue(status);
CREATE INDEX IF NOT EXISTS idx_target_companies_user_id ON target_companies(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (for service role, allow all)
-- Users table
CREATE POLICY "Enable all for service role" ON users
  FOR ALL USING (true);

-- CV Data table
CREATE POLICY "Enable all for service role" ON cv_data
  FOR ALL USING (true);

-- Jobs table
CREATE POLICY "Enable all for service role" ON jobs
  FOR ALL USING (true);

-- Applications table
CREATE POLICY "Enable all for service role" ON applications
  FOR ALL USING (true);

-- Application Queue table
CREATE POLICY "Enable all for service role" ON application_queue
  FOR ALL USING (true);

-- Target Companies table
CREATE POLICY "Enable all for service role" ON target_companies
  FOR ALL USING (true);
```

## Verify Tables

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- application_queue
- applications
- cv_data
- jobs
- target_companies
- users

## Sample Data (Optional)

```sql
-- Insert a test user
INSERT INTO users (email) VALUES ('test@example.com')
RETURNING *;

-- Insert a test job
INSERT INTO jobs (title, company, description, location, is_remote)
VALUES 
  ('Software Engineer', 'Google', 'Build amazing products', 'Mountain View, CA', false),
  ('Backend Developer', 'Meta', 'Scale infrastructure', 'Menlo Park, CA', false),
  ('Full Stack Engineer', 'Netflix', 'Stream the world', 'Los Gatos, CA', true)
RETURNING *;
```

## Check Schema

```sql
-- Show columns for each table
\d users
\d cv_data
\d jobs
\d applications
\d application_queue
\d target_companies
```
