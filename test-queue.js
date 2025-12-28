require('dotenv').config();
const applicationQueue = require('./services/queue');

async function testQueue() {
  console.log('🧪 Testing Bull Queue System\n');
  
  try {
    // Test 1: Check queue is accessible
    console.log('1️⃣ Checking queue connection...');
    const isRunning = await applicationQueue.isReady();
    console.log(isRunning ? '✅ Queue is ready' : '❌ Queue not ready');
    
    // Test 2: Get queue stats
    console.log('\n2️⃣ Getting queue statistics...');
    const counts = await applicationQueue.getJobCounts();
    console.log('📊 Queue Stats:', counts);
    
    // Test 3: Add a test job
    console.log('\n3️⃣ Adding test job to queue...');
    const testJob = await applicationQueue.add(
      {
        userId: 'test-user-123',
        jobId: 'test-job-456',
        cvData: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          skills: { technical: ['JavaScript', 'Node.js'], soft: [], tools: [] },
          experience: [],
          education: []
        },
        jobDetails: {
          company_name: 'Test Company',
          job_title: 'Software Engineer',
          application_url: 'https://example.com/apply'
        },
        resumePath: '/path/to/resume.pdf'
      },
      {
        delay: 2000,
        priority: 1,
        jobId: 'test-job-unique-id'
      }
    );
    
    console.log('✅ Test job added:', testJob.id);
    console.log('   Status:', await testJob.getState());
    
    // Test 4: Wait a bit and check status
    console.log('\n4️⃣ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const jobState = await testJob.getState();
    console.log('   Job state after wait:', jobState);
    
    // Test 5: Clean up
    console.log('\n5️⃣ Cleaning up test job...');
    await testJob.remove();
    console.log('✅ Test job removed');
    
    // Final stats
    const finalCounts = await applicationQueue.getJobCounts();
    console.log('\n📊 Final Queue Stats:', finalCounts);
    
    console.log('\n✅ Queue test completed successfully!');
    console.log('\n💡 To run the worker, execute: node workers/applyWorker.js');
    
  } catch (error) {
    console.error('❌ Queue test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure Redis is running (redis-server)');
    console.error('   2. Check REDIS_URL in .env file');
    console.error('   3. For local dev: redis://localhost:6379');
    console.error('   4. For production: Use Upstash or Railway Redis');
  } finally {
    await applicationQueue.close();
    process.exit(0);
  }
}

testQueue();
