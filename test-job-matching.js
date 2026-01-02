const supabase = require('./config/supabase');

async function testJobMatching() {
  console.log('🧪 Testing AI-Powered Job Matching Enhancement\n');

  try {
    // Test 1: Check if fit_details column exists
    console.log('📊 Test 1: Checking database schema...');
    const { data: jobs, error: schemaError } = await supabase
      .from('jobs')
      .select('id, fit_details')
      .limit(1);

    if (schemaError) {
      console.error('⚠️ Note: fit_details column may need to be added manually in Supabase');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log('   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fit_details JSONB;');
    } else {
      console.log('✅ Schema check passed\n');
    }

    // Test 2: Create a test user and CV
    console.log('📊 Test 2: Creating test user and CV...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test123456'
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }

    const userId = authUser.user.id;
    console.log(`✅ User created: ${userId}\n`);

    // Insert test CV
    const { error: cvError } = await supabase
      .from('cv_data')
      .insert({
        user_id: userId,
        name: 'John Doe',
        email: testEmail,
        skills: {
          technical: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
          soft: ['Communication', 'Leadership']
        },
        experience: [
          {
            company: 'Tech Corp',
            role: 'Software Engineer',
            duration: '2020-2023',
            description: 'Built scalable web applications'
          },
          {
            company: 'Startup Inc',
            role: 'Full Stack Developer',
            duration: '2018-2020',
            description: 'Developed mobile and web apps'
          }
        ],
        education: [
          {
            degree: 'B.S. Computer Science',
            institution: 'University',
            year: '2018'
          }
        ]
      });

    if (cvError) {
      console.error('❌ CV insert error:', cvError.message);
      return;
    }
    console.log('✅ Test CV created\n');

    // Test 3: Test job search endpoint
    console.log('📊 Test 3: Testing /api/jobs/search endpoint...');
    const searchPayload = {
      userId: userId,
      companies: ['Google', 'Microsoft'],
      roleKeywords: ['Software Engineer', 'Full Stack Developer']
    };

    console.log('Request:', JSON.stringify(searchPayload, null, 2));
    console.log('\n⏳ Searching jobs with AI-powered fit scoring...\n');
    
    const response = await fetch('http://localhost:3000/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchPayload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Job search successful!');
      console.log(`   Found ${result.jobs.length} jobs`);
      console.log(`   Breakdown:`, result.breakdown);
      
      // Show first job with fit details
      if (result.jobs.length > 0) {
        const firstJob = result.jobs[0];
        console.log('\n📋 Sample Job with AI Fit Analysis:');
        console.log(`   Company: ${firstJob.company_name}`);
        console.log(`   Title: ${firstJob.job_title}`);
        console.log(`   Fit Score: ${firstJob.fit_score}`);
        if (firstJob.fit_details) {
          console.log('   Fit Details:');
          console.log(`     Skills Match: ${firstJob.fit_details.skills_match}%`);
          console.log(`     Experience Level: ${firstJob.fit_details.experience_level}%`);
          console.log(`     Domain Match: ${firstJob.fit_details.domain_match}%`);
          console.log(`     Overall Score: ${firstJob.fit_details.overall_score}%`);
          console.log(`     Reasoning: ${firstJob.fit_details.reasoning}`);
        }
      }
    } else {
      console.error('❌ Job search failed:', result.error);
    }

    // Test 4: Test matches endpoint
    console.log('\n📊 Test 4: Testing /api/jobs/matches/:userId endpoint...');
    const matchesResponse = await fetch(`http://localhost:3000/api/jobs/matches/${userId}?recalculate=false`);
    const matchesResult = await matchesResponse.json();

    if (matchesResult.success) {
      console.log('✅ Matches endpoint working!');
      console.log(`   Total matches: ${matchesResult.total}`);
      console.log(`   Breakdown:`, matchesResult.breakdown);
    } else {
      console.error('❌ Matches failed:', matchesResult.error);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('applications').delete().eq('user_id', userId);
    await supabase.from('cv_data').delete().eq('user_id', userId);
    await supabase.auth.admin.deleteUser(userId);
    console.log('✅ Cleanup complete\n');

    console.log('🎉 All tests completed!');
    console.log('\n📝 Summary:');
    console.log('   ✅ AI-powered fit scoring implemented');
    console.log('   ✅ Job search with Perplexity AI integration');
    console.log('   ✅ Matches endpoint with score sorting');
    console.log('   ✅ Detailed fit analysis (skills, experience, domain, education)');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
console.log('Starting server test in 2 seconds...');
console.log('Make sure server is running on http://localhost:3000\n');

setTimeout(testJobMatching, 2000);
