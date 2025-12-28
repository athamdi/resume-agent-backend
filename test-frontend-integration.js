require('dotenv').config();

/**
 * Frontend Integration Test
 * Tests all authentication and API endpoints
 * Run this after starting the server with: node server.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testFrontendIntegration() {
  console.log('\n🧪 FRONTEND INTEGRATION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // ========================================
    // Test 1: Health Check
    // ========================================
    console.log('1️⃣  Testing Health Check...');
    const healthRes = await fetch(`${API_URL}/api/health`);
    const healthData = await healthRes.json();
    
    if (healthData.success) {
      console.log('   ✅ Health check passed');
      console.log(`      Status: ${healthData.status}`);
      console.log(`      Database: ${healthData.services.database}`);
      testsPassed++;
    } else {
      console.log('   ❌ Health check failed');
      testsFailed++;
    }
    
    // ========================================
    // Test 2: User Registration
    // ========================================
    console.log('\n2️⃣  Testing User Registration...');
    const testEmail = `testuser${Date.now()}@example.com`;
    const testPassword = 'TestPassword123';
    
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: 'Test User',
        password: testPassword
      })
    });
    
    const registerData = await registerRes.json();
    
    if (registerData.success && registerData.token) {
      console.log('   ✅ User registration passed');
      console.log(`      User ID: ${registerData.user.id}`);
      console.log(`      Email: ${registerData.user.email}`);
      console.log(`      Token received: ${registerData.token.substring(0, 20)}...`);
      testsPassed++;
    } else {
      console.log('   ❌ User registration failed');
      console.log(`      Error: ${registerData.error}`);
      testsFailed++;
      throw new Error('Registration failed - cannot continue tests');
    }
    
    const token = registerData.token;
    const userId = registerData.user.id;
    
    // ========================================
    // Test 3: Get Current User (Protected Route)
    // ========================================
    console.log('\n3️⃣  Testing Get Current User (Protected Route)...');
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const meData = await meRes.json();
    
    if (meData.success && meData.user) {
      console.log('   ✅ Get current user passed');
      console.log(`      User: ${meData.user.email}`);
      testsPassed++;
    } else {
      console.log('   ❌ Get current user failed');
      console.log(`      Error: ${meData.error}`);
      testsFailed++;
    }
    
    // ========================================
    // Test 4: CV Upload
    // ========================================
    console.log('\n4️⃣  Testing CV Upload...');
    const sampleCV = `
John Doe
john.doe@email.com | +1-234-567-8900

EXPERIENCE
Software Engineer at TechCorp (2020-2023)
- Built scalable microservices using Node.js
- Led team of 5 developers

EDUCATION
B.S. Computer Science, MIT, 2020

SKILLS
JavaScript, Python, React, Node.js, AWS
    `.trim();
    
    const cvRes = await fetch(`${API_URL}/api/cv/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ cvText: sampleCV })
    });
    
    const cvData = await cvRes.json();
    
    if (cvData.success) {
      console.log('   ✅ CV upload passed');
      console.log(`      CV ID: ${cvData.cv.id}`);
      if (cvData.analysis) {
        console.log(`      Analysis received: ${Object.keys(cvData.analysis).length} fields`);
      }
      testsPassed++;
    } else {
      console.log('   ❌ CV upload failed');
      console.log(`      Error: ${cvData.error}`);
      testsFailed++;
    }
    
    // ========================================
    // Test 5: Get User CV
    // ========================================
    console.log('\n5️⃣  Testing Get User CV...');
    const getCvRes = await fetch(`${API_URL}/api/cv/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const getCvData = await getCvRes.json();
    
    if (getCvData.success && getCvData.cv) {
      console.log('   ✅ Get user CV passed');
      console.log(`      CV found for user ${userId}`);
      testsPassed++;
    } else {
      console.log('   ❌ Get user CV failed');
      console.log(`      Error: ${getCvData.error}`);
      testsFailed++;
    }
    
    // ========================================
    // Test 6: Analytics Stats
    // ========================================
    console.log('\n6️⃣  Testing Analytics Stats...');
    const statsRes = await fetch(`${API_URL}/api/analytics/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const statsData = await statsRes.json();
    
    if (statsData.success && statsData.stats) {
      console.log('   ✅ Analytics stats passed');
      console.log(`      Total Applications: ${statsData.stats.total}`);
      console.log(`      Success Rate: ${statsData.stats.successRate}%`);
      testsPassed++;
    } else {
      console.log('   ❌ Analytics stats failed');
      console.log(`      Error: ${statsData.error}`);
      testsFailed++;
    }
    
    // ========================================
    // Test 7: Analytics Timeline
    // ========================================
    console.log('\n7️⃣  Testing Analytics Timeline...');
    const timelineRes = await fetch(`${API_URL}/api/analytics/timeline`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const timelineData = await timelineRes.json();
    
    if (timelineData.success) {
      console.log('   ✅ Analytics timeline passed');
      console.log(`      Timeline items: ${timelineData.count || 0}`);
      testsPassed++;
    } else {
      console.log('   ❌ Analytics timeline failed');
      console.log(`      Error: ${timelineData.error}`);
      testsFailed++;
    }
    
    // ========================================
    // Test 8: Login with Created User
    // ========================================
    console.log('\n8️⃣  Testing User Login...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const loginData = await loginRes.json();
    
    if (loginData.success && loginData.token) {
      console.log('   ✅ User login passed');
      console.log(`      New token received: ${loginData.token.substring(0, 20)}...`);
      testsPassed++;
    } else {
      console.log('   ❌ User login failed');
      console.log(`      Error: ${loginData.error}`);
      testsFailed++;
    }
    
    // ========================================
    // Test 9: Unauthorized Access (No Token)
    // ========================================
    console.log('\n9️⃣  Testing Unauthorized Access...');
    const unauthorizedRes = await fetch(`${API_URL}/api/auth/me`);
    const unauthorizedData = await unauthorizedRes.json();
    
    if (!unauthorizedData.success && unauthorizedRes.status === 401) {
      console.log('   ✅ Unauthorized access properly blocked');
      console.log(`      Error: ${unauthorizedData.error}`);
      testsPassed++;
    } else {
      console.log('   ❌ Unauthorized access test failed');
      console.log('      Protected routes should require authentication');
      testsFailed++;
    }
    
    // ========================================
    // Test 10: CORS Headers
    // ========================================
    console.log('\n🔟 Testing CORS Configuration...');
    const corsRes = await fetch(`${API_URL}/api/health`, {
      method: 'OPTIONS'
    });
    
    if (corsRes.ok) {
      console.log('   ✅ CORS properly configured');
      console.log('      Frontend can make cross-origin requests');
      testsPassed++;
    } else {
      console.log('   ⚠️  CORS may need adjustment');
      testsFailed++;
    }
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    testsFailed++;
  }
  
  // ========================================
  // Summary
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('✅ Backend is ready for frontend integration');
    console.log('✅ Authentication working correctly');
    console.log('✅ Protected routes secured');
    console.log('✅ CORS configured for frontend');
    console.log('✅ All API endpoints functional\n');
    console.log('🚀 You can now connect your Lovable frontend!\n');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.\n');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Check if server is running
console.log('⚠️  Make sure the server is running first:');
console.log('   node server.js\n');
console.log('⏳ Starting tests in 2 seconds...\n');

setTimeout(() => {
  testFrontendIntegration().catch(error => {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error('\nMake sure the server is running on', API_URL);
    process.exit(1);
  });
}, 2000);
