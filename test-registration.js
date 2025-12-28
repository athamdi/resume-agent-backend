/**
 * Quick Registration Test
 * Tests if the registration endpoint is working
 */

const API_URL = 'http://localhost:3000';

async function testRegistration() {
  console.log('🧪 TESTING REGISTRATION ENDPOINT\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Test 1: Health Check
  console.log('1️⃣  Health Check...');
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('   Status:', healthData.success ? '✅ PASS' : '❌ FAIL');
    console.log('   Database:', healthData.services?.database);
    console.log('');
  } catch (error) {
    console.error('   ❌ FAIL - Server not running?');
    console.error('   Make sure to run: node server.js\n');
    process.exit(1);
  }
  
  // Test 2: Register with Missing Fields
  console.log('2️⃣  Registration with Missing Fields (should fail)...');
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }) // Missing password
    });
    const data = await res.json();
    
    if (!data.success && data.error.includes('password')) {
      console.log('   ✅ PASS - Correctly rejected missing password');
    } else {
      console.log('   ❌ FAIL - Should reject missing password');
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ FAIL -', error.message);
    console.log('');
  }
  
  // Test 3: Register with Valid Data
  console.log('3️⃣  Registration with Valid Data...');
  const testEmail = `test${Date.now()}@example.com`;
  const testData = {
    email: testEmail,
    fullName: 'Test User',
    password: 'TestPass123'
  };
  
  console.log('   Sending:', { ...testData, password: '***' });
  
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log('   Response Status:', res.status);
    
    const data = await res.json();
    console.log('   Response Body:', JSON.stringify(data, null, 2));
    
    if (data.success && data.token && data.user) {
      console.log('\n   ✅ PASS - Registration successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Token:', data.token.substring(0, 30) + '...');
    } else {
      console.log('\n   ❌ FAIL - Registration failed');
      console.log('   Error:', data.error);
      console.log('   Message:', data.message);
      
      // Check for common issues
      if (data.message && data.message.includes('password_hash')) {
        console.log('\n   🔧 FIX NEEDED: Run this SQL in Supabase:');
        console.log('      ALTER TABLE users ADD COLUMN password_hash TEXT;');
      }
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ FAIL -', error.message);
    console.log('');
  }
  
  // Test 4: Try to Register Same Email (should fail)
  console.log('4️⃣  Registration with Duplicate Email (should fail)...');
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData) // Same email as test 3
    });
    const data = await res.json();
    
    if (!data.success && data.error.includes('exists')) {
      console.log('   ✅ PASS - Correctly rejected duplicate email');
    } else {
      console.log('   ❌ FAIL - Should reject duplicate email');
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ FAIL -', error.message);
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ REGISTRATION ENDPOINT TEST COMPLETE\n');
}

// Run test
console.log('⚠️  Make sure server is running: node server.js\n');
console.log('Starting test in 2 seconds...\n');

setTimeout(() => {
  testRegistration().catch(error => {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  });
}, 2000);
