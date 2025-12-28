require('dotenv').config();
const applicationQueue = require('../services/queue');

console.log('🚀 Application Worker Starting...');
console.log('📋 Queue Name:', applicationQueue.name);
console.log('🔗 Redis URL:', process.env.REDIS_URL || 'redis://localhost:6379');
console.log('⏰ Waiting for jobs...\n');

// Worker is already processing via queue.process() in services/queue.js
// This file just keeps the process alive and handles signals

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📴 Received SIGINT, shutting down gracefully...');
  await applicationQueue.close();
  console.log('✅ Worker shut down successfully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📴 Received SIGTERM, shutting down gracefully...');
  await applicationQueue.close();
  console.log('✅ Worker shut down successfully');
  process.exit(0);
});

// Keep process alive
setInterval(() => {
  applicationQueue.getJobCounts().then((counts) => {
    if (counts.waiting > 0 || counts.active > 0) {
      console.log('📊 Queue Status:', {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed
      });
    }
  }).catch(err => {
    console.error('❌ Error getting queue counts:', err.message);
  });
}, 30000); // Every 30 seconds

console.log('✅ Worker is running and ready to process jobs!');
