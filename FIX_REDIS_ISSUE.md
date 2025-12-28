# 🔧 Quick Fix Guide - Redis Connection Error

## Problem
The server shows Redis connection errors because Redis is not installed.

## Error Messages
```
❌ Queue error: AggregateError [ECONNREFUSED]
connect ECONNREFUSED 127.0.0.1:6379
```

---

## ✅ Solution 1: Use Upstash (Recommended - 2 minutes)

**Upstash provides free cloud Redis - no installation needed!**

### Steps:

1. **Sign up at Upstash**
   - Go to: https://upstash.com
   - Sign up (GitHub login works)

2. **Create Redis Database**
   - Click "Create Database"
   - Name: `resume-agent`
   - Region: Choose closest to you
   - Type: Regional (free tier)
   - Click "Create"

3. **Get Connection URL**
   - On database page, scroll to "REST API"
   - Copy the **"UPSTASH_REDIS_REST_URL"**
   - It looks like: `rediss://default:xxx@xxx.upstash.io:6379`

4. **Update .env file**
   ```env
   REDIS_URL=your-upstash-url-here
   ```

5. **Restart server**
   ```powershell
   node server.js
   ```

✅ You should see: `✅ Queue system connected to Redis`

---

## ✅ Solution 2: Install Redis Locally (Windows)

### Option A: Using Memurai (Recommended for Windows)

1. **Download Memurai** (Redis for Windows)
   - Go to: https://www.memurai.com/get-memurai
   - Download the free developer version
   - Install and run

2. **Start Memurai**
   - It runs as a Windows service automatically
   - Default port: 6379

3. **Restart your server**
   ```powershell
   node server.js
   ```

### Option B: Using WSL2 (If you have WSL installed)

1. **Install Redis in WSL**
   ```bash
   sudo apt update
   sudo apt install redis-server
   ```

2. **Start Redis**
   ```bash
   sudo service redis-server start
   ```

3. **Verify it's running**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

4. **Restart your server**
   ```powershell
   node server.js
   ```

---

## 🔍 Verify Redis is Working

After setting up Redis, you should see:

```
✅ Queue system connected to Redis
```

And NO more error messages about ECONNREFUSED.

---

## 🏥 Fix Database Table (30 seconds)

You also need to fix the missing `target_companies` table:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar

3. **Run the SQL script**
   - Copy contents of `create-target-companies-table.sql`
   - Paste and click "Run"

4. **Verify**
   ```powershell
   node verify-system.js
   ```
   
   Should show: `✅ Passed: 52` (no failures)

---

## 🎯 What You'll Achieve

After fixing both issues:
- ✅ No more Redis connection errors
- ✅ Queue system functional
- ✅ Applications can be processed
- ✅ All 52 verification tests pass
- ✅ System 100% operational

---

## 🆘 Still Having Issues?

### Redis Connection Test
```powershell
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379'); redis.ping().then(r => console.log('✅ Connected:', r)).catch(e => console.error('❌ Failed:', e.message));"
```

### Check Server Status
```powershell
curl http://localhost:3000/api/health
```

---

## 📚 Next Steps After Fix

1. ✅ Fix Redis (this guide)
2. ✅ Fix database table (`create-target-companies-table.sql`)
3. 🚀 Test the system: `node test-full-flow.js`
4. 🏗️ Build frontend in Lovable
5. 🌐 Deploy to production

---

## 💡 Why Upstash is Better for Development

- ✅ No installation required
- ✅ Works on all platforms (Windows/Mac/Linux)
- ✅ Free tier (10,000 commands/day)
- ✅ Persistent (survives restarts)
- ✅ Cloud-based (access anywhere)
- ✅ Production-ready
- ✅ Same Redis API

**Recommended: Use Upstash for both dev and production!**
