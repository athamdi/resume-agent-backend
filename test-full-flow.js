require('dotenv').config();
const supabase = require('./config/supabase');
const geminiService = require('./services/gemini');

async function testFullFlow() {
  console.log('🧪 Testing Complete Application Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const testUserId = `test-user-${Date.now()}`;
  
  try {
    // Step 1: Create test user
    console.log('1️⃣ Creating test user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: `test-${Date.now()}@example.com`
      })
      .select()
      .single();
    
    if (userError) throw userError;
    console.log('✅ User created:', user.id);
    
    // Step 2: Upload and analyze CV
    console.log('\n2️⃣ Analyzing CV...');
    const sampleCV = `
      Jane Smith
      jane.smith@email.com | +1-555-0123
      
      EXPERIENCE:
      Senior Software Engineer at Microsoft (2019-2023)
      - Led development of cloud-native applications using Node.js and Azure
      - Improved system performance by 50% through optimization
      - Mentored team of 5 junior developers
      
      Software Engineer at Amazon (2017-2019)
      - Built scalable REST APIs serving 10M+ requests/day
      - Implemented CI/CD pipelines reducing deployment time by 60%
      
      EDUCATION:
      M.S. Computer Science, Stanford University, 2017
      B.S. Computer Science, UC Berkeley, 2015
      
      SKILLS: JavaScript, TypeScript, Node.js, Python, React, AWS, Azure, Docker, Kubernetes
    `;
    
    const analyzedData = await geminiService.analyzeCv(sampleCV);
    console.log('✅ CV analyzed successfully');
    console.log('   Name:', analyzedData.fullName);
    console.log('   Email:', analyzedData.email);
    console.log('   Skills:', analyzedData.skills?.technical?.slice(0, 5).join(', '));
    console.log('   Experience Level:', analyzedData.experienceLevel);
    
    // Step 3: Save CV to database
    console.log('\n3️⃣ Saving CV to database...');
    const { data: cvData, error: cvError } = await supabase
      .from('cv_data')
      .insert({
        user_id: user.id,
        cv_text: sampleCV,
        full_name: analyzedData.fullName,
        email: analyzedData.email,
        phone: analyzedData.phone,
        skills: analyzedData.skills,
        experience: analyzedData.experience,
        education: analyzedData.education
      })
      .select()
      .single();
    
    if (cvError) throw cvError;
    console.log('✅ CV saved:', cvData.id);
    
    // Step 4: Add test jobs
    console.log('\n4️⃣ Adding test jobs...');
    const testJobs = [
      {
        company_name: 'Google',
        job_title: 'Senior Software Engineer',
        job_url: 'https://careers.google.com/job-123',
        job_description: 'Looking for a talented engineer to join our cloud team.',
        location: 'Remote',
        fit_score: 'strong',
        application_url: 'https://careers.google.com/apply/123'
      },
      {
        company_name: 'Meta',
        job_title: 'Staff Software Engineer',
        job_url: 'https://careers.meta.com/job-456',
        job_description: 'Build scalable systems at Meta.',
        location: 'Menlo Park, CA',
        fit_score: 'strong',
        application_url: 'https://careers.meta.com/apply/456'
      },
      {
        company_name: 'Netflix',
        job_title: 'Software Engineer',
        job_url: 'https://jobs.netflix.com/job-789',
        job_description: 'Work on streaming technology.',
        location: 'Los Gatos, CA',
        fit_score: 'conditional',
        application_url: 'https://jobs.netflix.com/apply/789'
      }
    ];
    
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .insert(testJobs)
      .select();
    
    if (jobsError) throw jobsError;
    console.log(`✅ ${jobs.length} jobs added`);
    jobs.forEach((job, idx) => {
      console.log(`   ${idx + 1}. ${job.job_title} at ${job.company_name} [${job.fit_score}]`);
    });
    
    // Step 5: Query matched jobs
    console.log('\n5️⃣ Querying matched jobs...');
    const { data: matchedJobs, error: matchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('fit_score', 'strong');
    
    if (matchError) throw matchError;
    console.log(`✅ Found ${matchedJobs.length} strong matches`);
    
    // Step 6: Simulate application (without actually applying)
    console.log('\n6️⃣ Simulating application process...');
    const jobToApply = jobs[0];
    
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: jobToApply.id,
        status: 'completed',
        application_date: new Date().toISOString(),
        confirmation_url: 'https://example.com/confirmation'
      })
      .select()
      .single();
    
    if (appError) throw appError;
    console.log('✅ Application created:', application.id);
    console.log('   Status:', application.status);
    
    // Step 7: Verify application
    console.log('\n7️⃣ Verifying application...');
    const { data: userApps, error: appsError } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (company_name, job_title, fit_score)
      `)
      .eq('user_id', user.id);
    
    if (appsError) throw appsError;
    console.log(`✅ User has ${userApps.length} application(s)`);
    userApps.forEach((app, idx) => {
      console.log(`   ${idx + 1}. ${app.jobs.job_title} at ${app.jobs.company_name} - ${app.status}`);
    });
    
    // Cleanup
    console.log('\n8️⃣ Cleaning up test data...');
    await supabase.from('applications').delete().eq('user_id', user.id);
    await supabase.from('cv_data').delete().eq('user_id', user.id);
    await supabase.from('jobs').delete().in('id', jobs.map(j => j.id));
    await supabase.from('users').delete().eq('id', user.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Full flow test completed successfully!\n');
    console.log('📋 Test Summary:');
    console.log('   ✓ User creation');
    console.log('   ✓ CV analysis with AI');
    console.log('   ✓ CV storage in database');
    console.log('   ✓ Job creation');
    console.log('   ✓ Job matching');
    console.log('   ✓ Application creation');
    console.log('   ✓ Application retrieval');
    console.log('   ✓ Data cleanup');
    console.log('\n🎉 All systems operational!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

testFullFlow();
