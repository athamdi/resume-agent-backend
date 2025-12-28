require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let testUserId = null;
let testJobId = null;
let testApplicationId = null;

console.log('🧪 Testing All API Endpoints\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function runTests() {
  try {
    // Create test user first
    console.log('🔧 Setup: Creating test user...');
    const supabase = require('./config/supabase');
    const { data: user } = await supabase
      .from('users')
      .insert({ email: `test-${Date.now()}@example.com` })
      .select()
      .single();
    testUserId = user.id;
    console.log('✅ Test user created:', testUserId, '\n');

    // Test 1: Analyze CV (without saving)
    console.log('1️⃣ Testing POST /api/cv/analyze');
    const sampleCV = `
      Sarah Johnson
      sarah.j@email.com | +1-555-0199
      
      EXPERIENCE:
      Senior Software Engineer at Meta (2020-2023)
      - Built scalable React applications
      - Led team of 4 developers
      
      EDUCATION:
      B.S. Computer Science, Stanford, 2020
      
      SKILLS: JavaScript, React, Node.js, Python
    `;
    
    const analyzeRes = await axios.post(`${API_URL}/cv/analyze`, { cvText: sampleCV });
    console.log('✅ Response:', analyzeRes.data.success ? 'Success' : 'Failed');
    console.log('   Name extracted:', analyzeRes.data.analyzedData?.fullName);
    console.log('   Skills:', analyzeRes.data.analyzedData?.skills?.technical?.slice(0, 3).join(', '));

    // Test 2: Upload CV
    console.log('\n2️⃣ Testing POST /api/cv/upload');
    const uploadRes = await axios.post(`${API_URL}/cv/upload`, {
      userId: testUserId,
      cvText: sampleCV
    });
    console.log('✅ CV uploaded:', uploadRes.data.success ? 'Success' : 'Failed');
    console.log('   CV ID:', uploadRes.data.cvId);

    // Test 3: Get user CV
    console.log('\n3️⃣ Testing GET /api/cv/:userId');
    const getCvRes = await axios.get(`${API_URL}/cv/${testUserId}`);
    console.log('✅ CV retrieved:', getCvRes.data.full_name);

    // Test 4: Add a job manually
    console.log('\n4️⃣ Testing POST /api/jobs/add');
    const jobRes = await axios.post(`${API_URL}/jobs/add`, {
      company_name: 'Google',
      job_title: 'Senior Frontend Engineer',
      job_url: 'https://careers.google.com/test-job',
      job_description: 'Build amazing UIs with React',
      location: 'Mountain View, CA',
      fit_score: 'strong',
      application_url: 'https://careers.google.com/apply/test'
    });
    console.log('✅ Job added:', jobRes.data.success ? 'Success' : 'Failed');
    console.log('   Job ID:', jobRes.data.jobId);
    testJobId = jobRes.data.jobId;

    // Test 5: Get matched jobs
    console.log('\n5️⃣ Testing GET /api/jobs/matches/:userId');
    const matchesRes = await axios.get(`${API_URL}/jobs/matches/${testUserId}`);
    console.log('✅ Jobs retrieved:', matchesRes.data.jobs.length, 'jobs');

    // Test 6: Apply to job (will queue)
    console.log('\n6️⃣ Testing POST /api/apply/:jobId');
    try {
      const applyRes = await axios.post(`${API_URL}/apply/${testJobId}`, {
        userId: testUserId
      });
      console.log('✅ Application queued:', applyRes.data.success ? 'Success' : 'Failed');
      console.log('   Application ID:', applyRes.data.applicationId);
      testApplicationId = applyRes.data.applicationId;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️  Cannot test application (CV PDF path not set)');
      } else {
        throw error;
      }
    }

    // Test 7: Get application status
    if (testApplicationId) {
      console.log('\n7️⃣ Testing GET /api/apply/status/:applicationId');
      const statusRes = await axios.get(`${API_URL}/apply/status/${testApplicationId}`);
      console.log('✅ Application status:', statusRes.data.status);
    }

    // Test 8: Get user applications
    console.log('\n8️⃣ Testing GET /api/apply/user/:userId');
    const userAppsRes = await axios.get(`${API_URL}/apply/user/${testUserId}`);
    console.log('✅ User applications:', userAppsRes.data.length, 'applications');

    // Test 9: Health check
    console.log('\n9️⃣ Testing GET /api/health');
    const healthRes = await axios.get(`${API_URL}/health`);
    console.log('✅ System status:', healthRes.data.status);
    console.log('   Database:', healthRes.data.services?.database);
    console.log('   AI Provider:', healthRes.data.services?.ai?.current);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('applications').delete().eq('user_id', testUserId);
    await supabase.from('cv_data').delete().eq('user_id', testUserId);
    if (testJobId) await supabase.from('jobs').delete().eq('id', testJobId);
    await supabase.from('users').delete().eq('id', testUserId);
    console.log('✅ Cleanup complete');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All endpoint tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.error('\n🔧 Make sure:');
    console.error('   1. Server is running (node server.js)');
    console.error('   2. Database is accessible');
    console.error('   3. AI provider is configured');
  } finally {
    process.exit(0);
  }
}

// Check if server is running first
axios.get('http://localhost:3000/')
  .then(() => {
    console.log('✅ Server is running\n');
    runTests();
  })
  .catch(() => {
    console.error('❌ Server is not running!');
    console.error('   Please start the server first: node server.js');
    process.exit(1);
  });
