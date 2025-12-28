const Bull = require('bull');
const supabase = require('../config/supabase');
const playwrightService = require('./playwright');

let redisAvailable = true;
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 60000; // Only log errors once per minute

// Create Bull queue with Upstash-compatible settings
const applicationQueue = new Bull('job-applications', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000 // 1 minute
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200 // Keep last 200 failed jobs
  },
  redis: {
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {
      rejectUnauthorized: false
    } : undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      if (times > 3) {
        redisAvailable = false;
        console.log('\n⚠️  Redis connection failed - Queue system disabled\n');
        return null; // Stop retrying
      }
      return Math.min(times * 1000, 3000);
    }
  }
});

// Process queue jobs
applicationQueue.process(async (job) => {
  const { userId, jobId, cvData, jobDetails, resumePath } = job.data;
  
  console.log(`📋 Processing application for job ${jobId} (attempt ${job.attemptsMade + 1})`);
  
  try {
    // Update status to processing
    await supabase
      .from('applications')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .eq('user_id', userId);

    // Apply to job using Playwright
    const result = await playwrightService.applyToJob({
      jobUrl: jobDetails.application_url,
      cvData,
      jobDetails,
      resumePdfPath: resumePath
    });

    // Update with result
    if (result.success) {
      console.log(`✅ Application successful for job ${jobId}`);
      
      await supabase
        .from('applications')
        .update({
          status: 'completed',
          confirmation_url: result.confirmationUrl,
          screenshot_url: result.screenshotPath,
          application_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
        .eq('user_id', userId);

      return { success: true, result };
    } else {
      console.log(`❌ Application failed for job ${jobId}: ${result.error}`);
      
      await supabase
        .from('applications')
        .update({
          status: 'failed',
          error_message: result.error,
          retry_count: job.attemptsMade + 1,
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
        .eq('user_id', userId);

      throw new Error(result.error);
    }

  } catch (error) {
    console.error(`❌ Queue processing error for job ${jobId}:`, error.message);
    
    await supabase
      .from('applications')
      .update({
        status: 'failed',
        error_message: error.message,
        retry_count: job.attemptsMade + 1,
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .eq('user_id', userId);
    
    throw error;
  }
});

// Event handlers
applicationQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

applicationQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`🚫 Job ${job.id} permanently failed after ${job.attemptsMade} attempts`);
  }
});

applicationQueue.on('error', (error) => {
  const now = Date.now();
  // Throttle error messages to prevent spam
  if (now - lastErrorTime > ERROR_THROTTLE_MS) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Redis connection failed - Queue system unavailable');
      console.error('   Install Redis or use Upstash: https://upstash.com');
      console.error('   The server will continue without queue functionality\n');
      redisAvailable = false;
    } else {
      console.error('❌ Queue error:', error.message);
    }
    lastErrorTime = now;
  }
});

applicationQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} is waiting to be processed`);
});

applicationQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} is now active`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down queue gracefully...');
  await applicationQueue.close();
  await playwrightService.close();
  process.exit(0);
});

// Helper to check Redis availability
const isRedisAvailable = () => redisAvailable;

// Initial connection test
applicationQueue.isReady()
  .then(() => {
    console.log('✅ Queue system connected to Redis');
    redisAvailable = true;
  })
  .catch((err) => {
    console.error('\n⚠️  Redis not available - Queue system disabled');
    console.error('   Install Redis or use Upstash: https://upstash.com');
    console.error('   The server will continue with limited functionality\n');
    redisAvailable = false;
  });

module.exports = applicationQueue;
module.exports.isRedisAvailable = isRedisAvailable;
