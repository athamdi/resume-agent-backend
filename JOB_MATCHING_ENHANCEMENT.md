# AI-Powered Job Matching Enhancement

## Overview
Enhanced the job matching algorithm in `routes/jobs.js` with Google Gemini AI-powered fit scoring. The system now provides detailed, intelligent analysis of how well a candidate matches each job posting.

## Key Features

### 1. AI-Powered Fit Calculation
- **Function**: `calculateJobFit(cvData, jobTitle, jobDescription, jobCompany)`
- **AI Model**: Google Gemini Pro
- **Scoring Factors**:
  - Skills Match (40% weight): Technical and soft skills alignment
  - Experience Level (30% weight): Years and relevance of experience
  - Domain Match (20% weight): Industry and domain expertise
  - Education Match (10% weight): Degree and educational background

### 2. Three-Tier Fit Categorization
- **Strong** (≥70%): High match, apply immediately
- **Conditional** (≥50%): Good match with some gaps
- **Stretch** (<50%): Requires significant skill development

### 3. Enhanced Endpoints

#### POST `/api/jobs/search`
**New Capabilities**:
- Integrates Perplexity AI for real-time job searching
- Calculates AI-powered fit scores for each job
- Returns detailed fit analysis (skills, experience, domain, education)
- Provides reasoning for each fit score

**Request**:
```json
{
  "userId": "user-uuid",
  "companies": ["Google", "Microsoft", "Amazon"],
  "roleKeywords": ["Software Engineer", "Full Stack Developer"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Found 6 jobs with AI-powered fit analysis",
  "jobs": [
    {
      "company_name": "Google",
      "job_title": "Software Engineer at Google",
      "job_url": "https://...",
      "fit_score": "strong",
      "fit_details": {
        "skills_match": 85,
        "experience_level": 75,
        "domain_match": 80,
        "education_match": 90,
        "overall_score": 82.5,
        "reasoning": "Strong technical skills match with 5+ years experience..."
      }
    }
  ],
  "breakdown": {
    "strong": 2,
    "conditional": 3,
    "stretch": 1
  }
}
```

#### GET `/api/jobs/matches/:userId`
**New Capabilities**:
- Automatic fit score recalculation for jobs without scores
- Intelligent sorting: strong > conditional > stretch
- Secondary sorting by overall_score within each category
- Optional query param `recalculate=true` to force recalculation

**Request**:
```
GET /api/jobs/matches/user-123?fitScore=strong&recalculate=false
```

**Response**:
```json
{
  "success": true,
  "jobs": [...],
  "total": 15,
  "breakdown": {
    "strong": 5,
    "conditional": 7,
    "stretch": 3
  }
}
```

#### POST `/api/jobs/recalculate-fit/:jobId`
**New Endpoint**: Manually recalculate fit score for a specific job

**Request**:
```json
{
  "userId": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Fit score recalculated successfully",
  "job": {
    "id": "job-123",
    "fit_score": "strong",
    "fit_details": {...}
  }
}
```

#### GET `/api/jobs/:jobId`
**Existing Endpoint**: Get specific job details by ID

## Technical Implementation

### AI Integration
- **Primary AI**: Google Gemini Pro (gemini-2.0-flash)
- **Job Search AI**: Perplexity Sonar Pro (real-time web search)
- **Fallback**: Basic keyword matching if AI unavailable

### Database Schema
New column added to `jobs` table:
```sql
ALTER TABLE jobs ADD COLUMN fit_details JSONB;
```

**fit_details structure**:
```json
{
  "skills_match": 85,
  "experience_level": 75,
  "domain_match": 80,
  "education_match": 90,
  "overall_score": 82.5,
  "reasoning": "Detailed explanation..."
}
```

### Error Handling
- AI service failures fallback to basic keyword matching
- Perplexity search failures fallback to mock data
- JSON parsing errors handled gracefully
- All errors logged for debugging

## Setup Instructions

### 1. Database Migration
Run in Supabase SQL Editor:
```sql
-- Add fit_details column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fit_details JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_fit_score ON jobs(fit_score);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);
```

### 2. Environment Variables
Ensure these are set:
```env
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key  # Optional but recommended
```

### 3. Test the Enhancement
```bash
# Start server
npm start

# In another terminal, run test
node test-job-matching.js
```

## Usage Examples

### Example 1: Search Jobs with AI Matching
```javascript
const response = await fetch('http://localhost:3000/api/jobs/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    companies: ['Google', 'Microsoft', 'Amazon'],
    roleKeywords: ['Software Engineer', 'Full Stack Developer']
  })
});

const result = await response.json();
console.log(`Found ${result.jobs.length} jobs`);
console.log('Strong matches:', result.breakdown.strong);
```

### Example 2: Get Matched Jobs
```javascript
const response = await fetch('http://localhost:3000/api/jobs/matches/user-123');
const result = await response.json();

// Jobs are sorted: strong > conditional > stretch
result.jobs.forEach(job => {
  console.log(`${job.job_title}: ${job.fit_score} (${job.fit_details.overall_score}%)`);
});
```

### Example 3: Recalculate Single Job
```javascript
const response = await fetch('http://localhost:3000/api/jobs/recalculate-fit/job-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-123' })
});

const result = await response.json();
console.log('Updated fit score:', result.job.fit_score);
```

## Performance Considerations

### AI Response Times
- Gemini API: ~2-5 seconds per job
- Perplexity API: ~3-7 seconds per search
- Batch processing: Jobs processed in parallel using `Promise.all()`

### Optimization Tips
1. **Cache Results**: Fit scores are stored in database
2. **Lazy Recalculation**: Only recalculate when CV changes
3. **Batch Processing**: Process multiple jobs simultaneously
4. **Fallback Logic**: Use basic matching if AI is slow/unavailable

### Rate Limits
- Gemini: 60 requests/minute (free tier)
- Perplexity: Varies by plan
- Implement exponential backoff for rate limit errors

## Testing

### Manual Testing
```bash
# Run comprehensive test suite
node test-job-matching.js

# Test individual endpoints
curl -X POST http://localhost:3000/api/jobs/search \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","companies":["Google"],"roleKeywords":["Engineer"]}'
```

### Expected Output
```
🧪 Testing AI-Powered Job Matching Enhancement

✅ Schema check passed
✅ User created
✅ Test CV created
✅ Job search successful!
   Found 4 jobs
   Breakdown: { strong: 2, conditional: 1, stretch: 1 }

📋 Sample Job with AI Fit Analysis:
   Company: Google
   Title: Software Engineer at Google
   Fit Score: strong
   Fit Details:
     Skills Match: 85%
     Experience Level: 75%
     Domain Match: 80%
     Overall Score: 82.5%
     Reasoning: Strong match...
```

## Deployment

### Railway Deployment
```bash
# Commit changes
git add .
git commit -m "feat: AI-powered job matching with Gemini"
git push origin main

# Railway will auto-deploy
# Verify at: https://resume-agent-backend-production.up.railway.app
```

### Environment Setup on Railway
Ensure these variables are set:
- `GEMINI_API_KEY`
- `PERPLEXITY_API_KEY` (optional)
- All other existing env vars

## Troubleshooting

### Issue: fit_details column missing
**Solution**: Run migration SQL in Supabase SQL Editor:
```sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fit_details JSONB;
```

### Issue: AI response too slow
**Solution**: 
- Reduce batch size in job search
- Implement timeout with fallback
- Use cached results when available

### Issue: Gemini quota exceeded
**Solution**:
- System automatically falls back to Perplexity
- Quota resets after 1 hour
- Consider upgrading Gemini API plan

### Issue: Job search returns no results
**Solution**:
- Check Perplexity API key
- System falls back to mock data
- Verify companies and keywords are valid

## Future Enhancements

### Planned Features
1. **ML Model Training**: Train custom model on successful applications
2. **Salary Prediction**: Estimate salary based on CV and market data
3. **Application Success Rate**: Predict likelihood of getting interview
4. **Skill Gap Analysis**: Identify skills to learn for better matches
5. **Company Culture Fit**: Analyze fit based on company values
6. **Automated Cover Letters**: Generate personalized cover letters per job

### Performance Improvements
1. **Caching Layer**: Redis cache for frequent queries
2. **Background Jobs**: Process fit calculations asynchronously
3. **Incremental Updates**: Only recalculate when CV changes
4. **Batch API Calls**: Reduce number of AI API calls

## API Reference Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/jobs/search` | POST | No | Search jobs with AI fit scoring |
| `/api/jobs/matches/:userId` | GET | No | Get matched jobs (sorted) |
| `/api/jobs/:jobId` | GET | No | Get specific job details |
| `/api/jobs/recalculate-fit/:jobId` | POST | No | Recalculate fit for one job |
| `/api/jobs/add` | POST | No | Manually add a job |

## Changelog

### Version 2.0 - AI-Powered Matching
- ✅ Added Gemini AI integration for fit scoring
- ✅ Added Perplexity AI for real-time job search
- ✅ Implemented weighted scoring algorithm
- ✅ Added detailed fit analysis (skills, experience, domain, education)
- ✅ Enhanced sorting and filtering
- ✅ Added recalculate-fit endpoint
- ✅ Fallback to basic matching if AI unavailable

### Version 1.0 - Basic Matching
- Basic keyword matching
- Mock job data
- Simple fit categorization

## Support
For issues or questions:
- Check logs: `railway logs` (production) or console (development)
- Review test output: `node test-job-matching.js`
- Verify environment variables in Railway dashboard
- Check Supabase database schema

---

**Status**: ✅ Enhancement Complete
**Last Updated**: 2024
**Deployment**: Ready for Railway
