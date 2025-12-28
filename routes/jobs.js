const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const aiProvider = require('../services/ai-provider');

// Search for jobs at target companies
router.post('/search', async (req, res) => {
  try {
    const { userId, companies, roleKeywords } = req.body;

    if (!userId || !companies || !roleKeywords) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, companies, and roleKeywords are required' 
      });
    }

    // Get user's CV data
    const { data: cvData, error: cvError } = await supabase
      .from('cv_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (cvError || !cvData) {
      return res.status(404).json({ 
        success: false, 
        error: 'CV not found. Please upload your CV first.' 
      });
    }

    console.log(`🔍 Searching jobs for ${companies.length} companies...`);

    // For now, returning mock data - in production, integrate with job board APIs
    const mockJobs = companies.flatMap((company, idx) => {
      return roleKeywords.map((role, roleIdx) => ({
        company_name: company,
        job_title: `${role} at ${company}`,
        job_url: `https://jobs.${company.toLowerCase().replace(/\s/g, '')}.com/role-${idx}-${roleIdx}`,
        job_description: `Looking for a talented ${role} to join our team at ${company}.`,
        location: 'Remote',
        salary_range: '$80k - $120k',
        application_url: `https://apply.${company.toLowerCase().replace(/\s/g, '')}.com/apply`,
        fit_score: calculateFitScore(cvData, role),
        posted_date: new Date().toISOString()
      }));
    });

    // Insert jobs into database
    const { data: insertedJobs, error: insertError } = await supabase
      .from('jobs')
      .upsert(mockJobs, { 
        onConflict: 'job_url',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting jobs:', insertError);
    }

    res.json({
      success: true,
      message: `Found ${mockJobs.length} jobs`,
      jobs: insertedJobs || mockJobs,
      breakdown: {
        strong: mockJobs.filter(j => j.fit_score === 'strong').length,
        conditional: mockJobs.filter(j => j.fit_score === 'conditional').length,
        stretch: mockJobs.filter(j => j.fit_score === 'stretch').length
      }
    });

  } catch (error) {
    console.error('❌ Job search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get matched jobs for user
router.get('/matches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fitScore } = req.query; // Optional filter: strong, conditional, stretch

    // Get user's CV data
    const { data: cvData, error: cvError } = await supabase
      .from('cv_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (cvError || !cvData) {
      return res.status(404).json({ 
        success: false, 
        error: 'CV not found' 
      });
    }

    // Query jobs
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (fitScore) {
      query = query.eq('fit_score', fitScore);
    }

    const { data: jobs, error: jobError } = await query;

    if (jobError) {
      return res.status(500).json({ 
        success: false, 
        error: jobError.message 
      });
    }

    res.json({
      success: true,
      jobs: jobs || [],
      total: jobs?.length || 0
    });

  } catch (error) {
    console.error('❌ Get matches error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manually add a job
router.post('/add', async (req, res) => {
  try {
    const jobData = req.body;

    if (!jobData.company_name || !jobData.job_title || !jobData.application_url) {
      return res.status(400).json({ 
        success: false, 
        error: 'company_name, job_title, and application_url are required' 
      });
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        company_name: jobData.company_name,
        job_title: jobData.job_title,
        job_url: jobData.job_url || jobData.application_url,
        job_description: jobData.job_description || '',
        location: jobData.location || '',
        salary_range: jobData.salary_range || '',
        fit_score: jobData.fit_score || 'conditional',
        application_url: jobData.application_url,
        posted_date: jobData.posted_date || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Job added successfully',
      jobId: job.id,
      job
    });

  } catch (error) {
    console.error('❌ Add job error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper: Calculate fit score based on CV and job role
function calculateFitScore(cvData, role) {
  const skills = cvData.skills?.technical || [];
  const experience = cvData.experience || [];
  
  // Simple scoring logic - can be enhanced with AI
  const roleKeywords = role.toLowerCase().split(' ');
  const cvText = JSON.stringify(cvData).toLowerCase();
  
  let matchScore = 0;
  roleKeywords.forEach(keyword => {
    if (cvText.includes(keyword)) matchScore++;
  });

  const experienceYears = experience.length;
  
  if (matchScore >= roleKeywords.length * 0.7 && experienceYears >= 2) {
    return 'strong';
  } else if (matchScore >= roleKeywords.length * 0.4 || experienceYears >= 1) {
    return 'conditional';
  } else {
    return 'stretch';
  }
}

module.exports = router;
