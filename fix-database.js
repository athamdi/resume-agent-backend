require('dotenv').config();

/**
 * Fix Database Schema
 * Adds missing columns to cv_data table
 */

const supabase = require('./config/supabase');

async function fixDatabase() {
  console.log('\n🔧 FIXING DATABASE SCHEMA\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Check if experience_level column exists
    console.log('1️⃣  Checking cv_data table schema...');
    
    const { data: columns, error: schemaError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'cv_data' 
          AND table_schema = 'public'
        `
      });
    
    if (schemaError) {
      console.log('   ⚠️  Cannot check schema via RPC, using manual insert test instead');
      
      // Try to insert a test record to see what columns are missing
      console.log('\n2️⃣  Testing CV insert with all fields...');
      
      // First, get a test user
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (!users || users.length === 0) {
        console.log('   ⚠️  No users found, creating test user...');
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: 'schema-test@example.com',
            full_name: 'Schema Test',
            password_hash: 'test123'
          })
          .select()
          .single();
        
        if (userError) throw userError;
        console.log(`   ✓ Test user created: ${newUser.id}`);
      }
      
      const testUserId = users?.[0]?.id || '';
      
      // Try insert with experience_level
      const { data: testCv, error: insertError } = await supabase
        .from('cv_data')
        .insert({
          user_id: testUserId,
          cv_text: 'Test CV',
          full_name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          skills: ['JavaScript'],
          experience: ['Test'],
          education: ['Test'],
          experience_level: 'mid'
        })
        .select();
      
      if (insertError) {
        if (insertError.message.includes('experience_level')) {
          console.log('\n   ❌ Missing column: experience_level');
          console.log('\n📋 REQUIRED SQL COMMAND:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('ALTER TABLE cv_data ADD COLUMN IF NOT EXISTS experience_level TEXT;\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('⚠️  Please run this SQL command in your Supabase SQL Editor');
          console.log('   at: https://supabase.com/dashboard/project/[your-project]/sql\n');
        } else {
          console.log('\n   ❌ Unexpected error:', insertError.message);
        }
      } else {
        console.log('   ✅ All columns exist! Schema is correct.');
        
        // Clean up test data
        await supabase
          .from('cv_data')
          .delete()
          .eq('id', testCv[0].id);
        
        console.log('   ✓ Test data cleaned up\n');
      }
      
    } else {
      console.log('   ✓ Schema check complete\n');
      
      const columnNames = columns.map(c => c.column_name);
      console.log('   Columns found:', columnNames.join(', '));
      
      if (!columnNames.includes('experience_level')) {
        console.log('\n   ❌ Missing column: experience_level\n');
        console.log('📋 REQUIRED SQL COMMAND:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('ALTER TABLE cv_data ADD COLUMN IF NOT EXISTS experience_level TEXT;\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        console.log('\n   ✅ All required columns exist!\n');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 MANUAL FIX REQUIRED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run this command:\n');
    console.log('   ALTER TABLE cv_data ADD COLUMN IF NOT EXISTS experience_level TEXT;\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

fixDatabase();
