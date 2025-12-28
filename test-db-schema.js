require('dotenv').config();
const supabase = require('./config/supabase');

async function checkSchema() {
  console.log('🔍 CHECKING DATABASE SCHEMA\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Test 1: Check if users table exists and has required columns
    console.log('1️⃣  Testing users table structure...');
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, password_hash, created_at')
      .limit(1);
    
    if (error) {
      if (error.message.includes('password_hash') || error.code === '42703') {
        console.log('   ❌ password_hash column is MISSING from users table\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔧 FIX REQUIRED:\n');
        console.log('Run this SQL in Supabase SQL Editor:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('ALTER TABLE users ADD COLUMN password_hash TEXT;');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return false;
      } else if (error.code === '42P01') {
        console.log('   ❌ users table does NOT exist\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔧 FIX REQUIRED:\n');
        console.log('Create users table in Supabase SQL Editor:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
        `);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return false;
      } else {
        console.log('   ❌ Database error:', error.message);
        console.log('      Code:', error.code);
        console.log('      Details:', error.details);
        return false;
      }
    }
    
    console.log('   ✅ users table structure is correct');
    console.log('      Columns: id, email, full_name, password_hash, created_at\n');
    
    // Test 2: Try to insert a test user (will rollback)
    console.log('2️⃣  Testing user insertion...');
    const testEmail = `test_schema_${Date.now()}@example.com`;
    const { data: testUser, error: insertError } = await supabase
      .from('users')
      .insert({ 
        email: testEmail,
        full_name: 'Test User',
        password_hash: 'test_hash_12345'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('   ❌ Cannot insert user:', insertError.message);
      return false;
    }
    
    console.log('   ✅ User insertion works');
    console.log(`      Test user created: ${testUser.id}\n`);
    
    // Test 3: Clean up test user
    console.log('3️⃣  Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUser.id);
    
    if (deleteError) {
      console.log('   ⚠️  Could not delete test user (not critical)');
    } else {
      console.log('   ✅ Test user deleted\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL DATABASE SCHEMA CHECKS PASSED!\n');
    console.log('Database is ready for user registration.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the check
checkSchema().then((success) => {
  if (!success) {
    console.log('⚠️  Fix the database schema issues above before using registration.\n');
    process.exit(1);
  } else {
    process.exit(0);
  }
});
