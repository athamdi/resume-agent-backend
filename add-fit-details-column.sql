-- Add fit_details column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS fit_details JSONB;

-- Add comment to describe the column
COMMENT ON COLUMN jobs.fit_details IS 'Detailed AI-powered fit analysis including skills_match, experience_level, domain_match, education_match, overall_score, and reasoning';

-- Create index for faster queries on fit scores
CREATE INDEX IF NOT EXISTS idx_jobs_fit_score ON jobs(fit_score);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);
