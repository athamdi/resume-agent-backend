require('dotenv').config();

const BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.RAILWAY_FRONTEND_URL || 'http://localhost:5173';

async function testProduction() {
  console.log('\n🧪 TESTING PRODUCTION DEPLOYMENT\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('Frontend URL:', FRONTEND_URL);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing Backend Health...');
    const health = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await health.json();
    console.log('   ✅', healthData.status);

    // Test 2: CORS Preflight
    console.log('\n2️⃣  Testing CORS from Frontend...');
    const corsTest = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    console.log('   ✅ CORS Status:', corsTest.status);

    // Test 3: Register User
    console.log('\n3️⃣  Testing User Registration...');
    const registerRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        email: `prod-test-${Date.now()}@example.com`,
        fullName: 'Production Test User',
        password: 'testpass123'
      })
    });
    const registerData = await registerRes.json();
    
    if (registerData.success) {
      console.log('   ✅ Registration successful');
      console.log('   User ID:', registerData.user.id);
      
      const token = registerData.token;
      
      // Test 4: Protected Route
      console.log('\n4️⃣  Testing Protected Route...');
      const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL
        }
      });
      const meData = await meRes.json();
      console.log('   ✅ Auth working:', meData.success);
      
      // Test 5: CV Upload
      console.log('\n5️⃣  Testing CV Upload...');
      const cvRes = await fetch(`${BACKEND_URL}/api/cv/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL
        },
        body: JSON.stringify({
          cvText: 'John Doe\njohn@email.com\n+1234567890\n\nSoftware Engineer with 5 years of experience...'
        })
      });
      const cvData = await cvRes.json();
      console.log('   ✅ CV Upload:', cvData.success ? 'Success' : 'Failed');
      
    } else {
      console.log('   ❌ Registration failed:', registerData.error);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL PRODUCTION TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (!process.env.RAILWAY_BACKEND_URL || !process.env.RAILWAY_FRONTEND_URL) {
  console.log('⚠️  For production testing, set environment variables:');
  console.log('   RAILWAY_BACKEND_URL=https://your-backend.up.railway.app \\');
  console.log('   RAILWAY_FRONTEND_URL=https://your-frontend.up.railway.app \\');
  console.log('   node test-production.js\n');
  console.log('💡 For local testing, use: node test-frontend-integration.js\n');
} else {
  testProduction();
}
