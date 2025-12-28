require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://role-compass-path.lovable.app',
    'https://role-compass-path-production.up.railway.app',
    /\.lovable\.app$/,  // Allow all Lovable subdomains
    /\.railway\.app$/   // Allow all Railway subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📝 [${timestamp}] ${req.method} ${req.path}`);
  
  // Log request body for debugging (excluding passwords in production)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) {
      sanitizedBody.password = '***hidden***';
    }
    console.log('   Body:', JSON.stringify(sanitizedBody, null, 2));
  }
  
  next();
});

// Import routes
const applyRoutes = require('./routes/apply');
const cvRoutes = require('./routes/cv');
const jobsRoutes = require('./routes/jobs');
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/apply', applyRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/jobs', jobsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: '🤖 Resume Agent API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      cv: '/api/cv',
      jobs: '/api/jobs',
      apply: '/api/apply',
      analytics: '/api/analytics',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const supabase = require('./config/supabase');
    
    // Check database
    const { error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    // Get queue stats (optional - won't fail if Redis not available)
    let queueStats = { waiting: 0, active: 0, status: 'not available' };
    try {
      const queue = require('./services/queue');
      const stats = await Promise.race([
        queue.getStats(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Queue timeout')), 2000)
        )
      ]);
      queueStats = { ...stats, status: 'connected' };
    } catch (queueError) {
      // Queue not available - this is ok for basic functionality
      queueStats.status = 'disconnected (Redis not running)';
    }
    
    res.json({
      success: true,
      status: dbError ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbError ? 'error' : 'connected',
        queue: queueStats.status
      },
      queue: {
        waiting: queueStats.waiting || 0,
        active: queueStats.active || 0,
        completed: queueStats.completed || 0,
        failed: queueStats.failed || 0
      },
      config: {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        dailyLimit: process.env.MAX_APPLICATIONS_PER_DAY || 20
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const supabase = require('./config/supabase');
    const { data, error } = await supabase
      .from('users')
      .select('count');
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: '✅ Database connected successfully!',
      data 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// Test Gemini AI
app.post('/api/test-gemini', async (req, res) => {
  try {
    const aiProvider = require('./services/ai-provider');
    const sampleCV = `
      John Doe
      john.doe@email.com | +1-234-567-8900
      
      Software Engineer at Google (2020-2023)
      Built scalable microservices using Node.js
      
      B.S. Computer Science, MIT, 2020
      Skills: JavaScript, Python, React
    `;
    
    const analysis = await aiProvider.analyzeCv(sampleCV);
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Resume Agent Backend Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`📊 Database: http://localhost:${PORT}/api/test-db`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Available Endpoints:');
  console.log('  🔐 Authentication:');
  console.log('    POST /api/auth/register - Register new user');
  console.log('    POST /api/auth/login - Login user');
  console.log('    GET  /api/auth/me - Get current user (protected)');
  console.log('  📊 Analytics:');
  console.log('    GET  /api/analytics/stats - Get user statistics (protected)');
  console.log('    GET  /api/analytics/timeline - Get application timeline (protected)');
  console.log('  📄 CV Management:');
  console.log('    POST /api/cv/upload - Upload & analyze CV');
  console.log('    POST /api/cv/analyze - Analyze CV without saving');
  console.log('    GET  /api/cv/:userId - Get user CV');
  console.log('  🔍 Job Search:');
  console.log('    POST /api/jobs/search - Search for jobs');
  console.log('    GET  /api/jobs/matches/:userId - Get matched jobs');
  console.log('    POST /api/jobs/add - Add job manually');
  console.log('  ✉️  Applications:');
  console.log('    POST /api/apply/:jobId - Apply to job (queued)');
  console.log('    POST /api/apply/bulk - Apply to multiple jobs');
  console.log('    GET  /api/apply/status/:appId - Get application status');
  console.log('    GET  /api/apply/user/:userId - Get user applications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});