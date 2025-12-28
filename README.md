# 🤖 AI Resume Agent Backend

Complete automated job application system with intelligent AI fallback, browser automation, and queue processing.

## 🎯 Overview

This backend powers an AI-driven job application assistant that:
- **Analyzes CVs** using Google Gemini AI (with Perplexity fallback)
- **Matches jobs** based on skills and experience
- **Automates applications** using Playwright browser automation
- **Manages queue** with Bull/Redis for background processing
- **Tracks applications** with status updates and daily limits

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │ (Lovable - To Be Built)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │
│  - CV Routes    │
│  - Job Routes   │
│  - Apply Routes │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬──────────┐
    ▼         ▼            ▼          ▼
┌────────┐ ┌──────┐ ┌────────────┐ ┌─────────┐
│Supabase│ │ AI   │ │ Playwright │ │  Bull   │
│Postgres│ │Layer │ │  Chromium  │ │  Queue  │
└────────┘ └──────┘ └────────────┘ └─────────┘
           │                          │
      ┌────┴────┐                     ▼
      ▼         ▼              ┌──────────────┐
  ┌────────┐ ┌──────────┐     │applyWorker.js│
  │ Gemini │ │Perplexity│     └──────────────┘
  │(Primary)│ │(Fallback)│
  └────────┘ └──────────┘
```

## ✨ Features

### 🧠 Intelligent AI Provider System
- **Auto-fallback**: Switches to Perplexity when Gemini quota exceeded
- **Smart retry**: Stays on fallback for 1 hour before retrying primary
- **Zero downtime**: Seamless provider switching with no user impact

### 📄 CV Analysis
- Extracts structured data: name, email, phone, skills, experience
- Calculates experience level (entry/mid/senior)
- Generates professional summaries
- Stores in PostgreSQL for instant retrieval

### 💼 Job Matching
- Fit score calculation: Strong (80%+), Conditional (60-79%), Stretch (<60%)
- Skills alignment analysis
- Experience level matching
- Location and remote preferences

### 🚀 Application Automation
- **Multi-platform support**:
  - ✅ Greenhouse ATS
  - ✅ Lever ATS
  - ✅ Workday
  - ✅ LinkedIn Easy Apply
  - ✅ Generic forms
- Auto-detection of ATS type
- Intelligent form filling
- Resume auto-upload
- Screenshot capture for verification
- Rate limiting (20 applications/day)

### 📊 Queue Management
- Background job processing with Bull
- 3 retry attempts with exponential backoff
- Job status tracking (pending/processing/completed/failed)
- Progress events and error handling

## 🗂️ Database Schema

```sql
users
  - id (uuid)
  - email (text)
  - created_at (timestamp)

cv_data
  - id (uuid)
  - user_id (uuid) → users.id
  - name (text)
  - email (text)
  - phone (text)
  - skills (jsonb)
  - education (jsonb)
  - experience (jsonb)
  - experience_level (text)
  - created_at (timestamp)
  - updated_at (timestamp)

jobs
  - id (uuid)
  - title (text)
  - company (text)
  - description (text)
  - requirements (text)
  - application_url (text)
  - location (text)
  - job_type (text)
  - is_remote (boolean)
  - created_at (timestamp)

applications
  - id (uuid)
  - user_id (uuid) → users.id
  - job_id (uuid) → jobs.id
  - status (text) - pending/completed/failed
  - applied_at (timestamp)
  - cover_letter (text)
  - notes (jsonb)
  - created_at (timestamp)

application_queue
  - id (uuid)
  - user_id (uuid)
  - job_id (uuid)
  - priority (integer)
  - status (text)
  - retry_count (integer)
  - error_message (text)
  - created_at (timestamp)
  - updated_at (timestamp)

target_companies
  - id (uuid)
  - user_id (uuid)
  - company_name (text)
  - priority (integer)
  - notes (text)
  - created_at (timestamp)
```

## 🛠️ Tech Stack

- **Runtime**: Node.js v24.12.0
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **AI**: 
  - Google Gemini Pro (gemini-2.0-flash)
  - Perplexity AI (sonar-pro)
- **Automation**: Playwright (Chromium)
- **Queue**: Bull + Redis
- **Testing**: Custom integration tests

## 📦 Installation

### Prerequisites
- Node.js v18+ 
- PostgreSQL (via Supabase)
- Redis (local or Upstash)
- API Keys:
  - Google Gemini API
  - Perplexity API
  - Supabase credentials

### Setup

1. **Clone repository**
```bash
cd resume-agent-backend
npm install
```

2. **Environment variables**
Create `.env` file:
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# AI APIs
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key

# Redis
REDIS_URL=redis://localhost:6379
# OR for Upstash:
# REDIS_URL=rediss://default:password@host:port

# Server
PORT=3000
```

3. **Install Redis** (choose one):

**Option A: Local Redis**
```bash
# Windows (via Chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis
redis-server
```

**Option B: Upstash Redis (Free cloud)**
1. Go to https://upstash.com/
2. Create free account
3. Create Redis database
4. Copy connection URL to `.env`

4. **Run database migrations**
```bash
# Create tables in Supabase using the SQL editor:
# Copy schema from docs/database-schema.sql
```

5. **Start server**
```bash
node server.js
```

Server runs on `http://localhost:3000`

## 🧪 Testing

### Run Integration Test
```bash
node test-full-flow.js
```

Tests complete user flow:
1. ✅ User creation
2. ✅ CV analysis (AI)
3. ✅ CV storage
4. ✅ Job creation
5. ✅ Job matching
6. ✅ Application creation
7. ✅ Application tracking
8. ✅ Data cleanup

### Test Specific Components

**Test AI Service:**
```bash
node test-gemini.js
```

**Test Queue System:**
```bash
node test-queue.js
```

**Test Playwright Automation:**
```bash
node test-playwright.js
```

**Test All API Endpoints:**
```bash
# Start server first
node server.js

# In another terminal
node test-all-endpoints.js
```

## 🔌 API Endpoints

### CV Routes (`/api/cv`)

#### `POST /api/cv/upload`
Upload and analyze CV
```json
{
  "userId": "uuid",
  "cvText": "Your CV content here..."
}
```

#### `POST /api/cv/analyze`
Analyze CV with AI
```json
{
  "cvText": "Your CV content here..."
}
```

#### `GET /api/cv/:userId`
Get user's CV data

---

### Job Routes (`/api/jobs`)

#### `POST /api/jobs/search`
Search jobs
```json
{
  "query": "software engineer",
  "location": "Remote",
  "limit": 10
}
```

#### `GET /api/jobs/matches/:userId`
Get job matches for user

#### `POST /api/jobs/add`
Add new job
```json
{
  "title": "Senior Software Engineer",
  "company": "Google",
  "description": "...",
  "requirements": "...",
  "application_url": "https://...",
  "location": "Remote",
  "job_type": "Full-time",
  "is_remote": true
}
```

#### `GET /api/jobs/:jobId`
Get job details

---

### Application Routes (`/api/apply`)

#### `POST /api/apply/:jobId`
Submit application (queued)
```json
{
  "userId": "uuid",
  "priority": 1
}
```

#### `POST /api/apply/bulk`
Bulk apply to multiple jobs
```json
{
  "userId": "uuid",
  "jobIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### `GET /api/apply/status/:applicationId`
Check application status

#### `GET /api/apply/user/:userId`
Get user's applications

---

### Health Check

#### `GET /health`
Server health status

## 🎮 Usage Examples

### Complete Application Flow

```javascript
// 1. Create user and upload CV
const cvResponse = await fetch('http://localhost:3000/api/cv/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    cvText: 'John Doe\nSoftware Engineer...'
  })
});

// 2. Find matching jobs
const matchesResponse = await fetch(
  'http://localhost:3000/api/jobs/matches/user-123'
);
const { strong, conditional } = await matchesResponse.json();

// 3. Apply to top matches
const applyResponse = await fetch(
  'http://localhost:3000/api/apply/bulk',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user-123',
      jobIds: strong.map(j => j.id).slice(0, 5)
    })
  }
);

// 4. Check application status
const statusResponse = await fetch(
  'http://localhost:3000/api/apply/user/user-123'
);
const applications = await statusResponse.json();
```

## 🚀 Background Worker

Run the application worker to process queued jobs:

```bash
node workers/applyWorker.js
```

The worker:
- Processes jobs from the Bull queue
- Uses Playwright to automate applications
- Retries failed applications (max 3 attempts)
- Updates application status in database
- Captures screenshots for verification

## 📊 AI Provider Logic

```javascript
// Automatic fallback on quota exceeded
if (error.status === 429) {
  console.warn('⚠️ Gemini quota exceeded, switching to Perplexity');
  fallbackUntil = Date.now() + 60 * 60 * 1000; // 1 hour
  return await callPerplexity(prompt);
}

// Use Gemini if quota available
if (Date.now() < fallbackUntil) {
  return await callPerplexity(prompt);
} else {
  return await callGemini(prompt);
}
```

## 🔒 Rate Limiting

- **Daily limit**: 20 applications per user
- **Enforced**: At API level and worker level
- **Reset**: Midnight UTC

## 📸 Screenshots

Application screenshots saved to:
```
screenshots/
  ├── application_[timestamp]_[jobId].png
  └── ...
```

## 🐛 Error Handling

All errors logged with context:
- Request ID
- Error type
- Stack trace
- User/Job IDs

Example error response:
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

## 📈 Monitoring

### Check Queue Status
```bash
# In Node.js console or test
const queue = require('./services/queue');
const counts = await queue.getJobCounts();
console.log('Waiting:', counts.waiting);
console.log('Active:', counts.active);
console.log('Completed:', counts.completed);
console.log('Failed:', counts.failed);
```

### Check AI Provider Status
```bash
curl http://localhost:3000/health
```

## 🔄 Development Workflow

1. **Start development server**
```bash
node server.js
# Listens on http://localhost:3000
```

2. **Run worker in separate terminal**
```bash
node workers/applyWorker.js
```

3. **Test changes**
```bash
node test-full-flow.js
```

## 🚧 Next Steps

### Immediate
- [ ] Install Redis
- [ ] Test queue system
- [ ] Validate all endpoints
- [ ] Start background worker

### Short-term
- [ ] Build frontend in Lovable
- [ ] Integrate real job board APIs
- [ ] Add email notifications
- [ ] Implement CAPTCHA handling

### Long-term
- [ ] Deploy to production (Railway/Vercel)
- [ ] Add rate limiting middleware
- [ ] Implement user authentication
- [ ] Build admin dashboard
- [ ] Add analytics and reporting

## 🎯 Test Results

Latest integration test (successful):
```
✅ User created
✅ CV analyzed (via Perplexity fallback)
✅ CV saved to database
✅ 3 jobs added (Google, Meta, Netflix)
✅ Found 2 strong matches
✅ Application created and tracked
✅ Data cleanup successful

🎉 All systems operational!
```

## 📝 File Structure

```
resume-agent-backend/
├── config/
│   └── supabase.js          # Database connection
├── routes/
│   ├── apply.js             # Application endpoints
│   ├── cv.js                # CV endpoints
│   └── jobs.js              # Job endpoints
├── services/
│   ├── ai-provider.js       # Smart AI router with fallback
│   ├── gemini.js            # CV analysis, cover letters
│   ├── playwright.js        # Browser automation
│   └── queue.js             # Bull queue manager
├── workers/
│   └── applyWorker.js       # Background job processor
├── screenshots/             # Application screenshots
├── test-all-endpoints.js    # API test suite
├── test-full-flow.js        # Integration test
├── test-gemini.js           # AI service test
├── test-playwright.js       # Automation test
├── test-queue.js            # Queue test
├── server.js                # Main Express server
├── package.json
├── .env
└── README.md
```

## 🤝 Contributing

This is a learning project. Suggestions welcome!

## 📄 License

MIT

## 🙏 Credits

Built with:
- [Supabase](https://supabase.com) - Database
- [Google Gemini](https://ai.google.dev/) - AI
- [Perplexity AI](https://www.perplexity.ai/) - Fallback AI
- [Playwright](https://playwright.dev/) - Automation
- [Bull](https://github.com/OptimalBits/bull) - Queue
- [Express](https://expressjs.com/) - API Framework

---

**Status**: ✅ Backend Complete | ⏳ Frontend Pending | 🔄 Redis Setup Needed

**Current AI Provider**: 🔄 Perplexity (Gemini quota exceeded)

**Last Updated**: December 2024
