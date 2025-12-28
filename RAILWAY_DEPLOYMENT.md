# Railway Deployment Guide

## Quick Deploy Steps

### 1. Deploy Backend to Railway

1. Go to https://railway.app
2. Click "+ New Project"
3. Select "Deploy from GitHub repo"
4. Choose `resume-agent-backend`
5. Click "Deploy Now"

### 2. Add Environment Variables

In Railway dashboard → Backend service → "Variables" tab → "Raw Editor":

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
GEMINI_API_KEY=your-gemini-key
PERPLEXITY_API_KEY=your-perplexity-key
REDIS_URL=your-redis-url
JWT_SECRET=generate-random-secret
PORT=3000
NODE_ENV=production
MAX_APPLICATIONS_PER_DAY=20
APPLICATION_DELAY_MS=30000
```

### 3. Generate Backend Domain

Settings → Networking → Generate Domain

Copy URL (e.g., `https://resume-agent-backend-production.up.railway.app`)

### 4. Update Frontend

In Railway → Frontend service → Variables:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
```

### 5. Test Deployment

```bash
RAILWAY_BACKEND_URL=https://your-backend.up.railway.app \
RAILWAY_FRONTEND_URL=https://your-frontend.up.railway.app \
node test-production.js
```

## API Endpoints

- Health: `GET /api/health`
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Upload CV: `POST /api/cv/upload` (protected)
- Get CV: `GET /api/cv/me` (protected)
- Stats: `GET /api/analytics/stats` (protected)

## Troubleshooting

- Check Railway logs for errors
- Verify all environment variables are set
- Test health endpoint first
- Ensure CORS allows your frontend domain
