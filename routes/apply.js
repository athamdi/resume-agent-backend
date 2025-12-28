const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const applicationQueue = require('../services/queue');
const { isRedisAvailable } = require('../services/queue');

// Apply to a single job (adds to queue)
router.post('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    // Get CV data
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

    // Get job details
    const { data: jobDetails, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobDetails) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .single();

    if (existingApp) {
      return res.status(400).json({
        success: false,
        error: `Already applied to this job. Status: ${existingApp.status}`,
        applicationId: existingApp.id
      });
    }

    // Create application record
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        job_id: jobId,
        status: 'queued'
      })
      .select()
      .single();

    if (appError) {
      return res.status(500).json({ 
        success: false, 
        error: appError.message 
      });
    }

    // Check if Redis is available
    if (!isRedisAvailable()) {
      // Update status to indicate queue is unavailable
      await supabase
        .from('applications')
        .update({ 
          status: 'failed',
          error_message: 'Queue system unavailable - Redis not connected'
        })
        .eq('id', application.id);

      return res.status(503).json({
        success: false,
        error: 'Queue system unavailable. Please install Redis or configure Upstash.',
        message: 'Application created but cannot be processed without Redis',
        applicationId: application.id,
        help: 'Visit https://upstash.com for cloud Redis'
      });
    }

    // Add to queue
    const job = await applicationQueue.add(
      {
        userId,
        jobId,
        cvData,
        jobDetails,
        resumePath: cvData.cv_pdf_url
      },
      {
        delay: 5000, // Wait 5 seconds before starting
        priority: 1,
        jobId: `app-${application.id}` // Unique job ID
      }
    );

    console.log(`✅ Application queued: Job ${jobDetails.job_title} at ${jobDetails.company_name}`);

    res.json({
      success: true,
      message: 'Application queued successfully',
      applicationId: application.id,
      queueJobId: job.id,
      estimatedStart: new Date(Date.now() + 5000).toISOString()
    });

  } catch (error) {
    console.error('❌ Apply error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Apply to multiple jobs in bulk
router.post('/bulk', async (req, res) => {
  try {
    const { userId, jobIds } = req.body;

    if (!userId || !jobIds || !Array.isArray(jobIds)) {
      return res.status(400).json({
        success: false,
        error: 'userId and jobIds (array) are required'
      });
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const { data: todayApps } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', today);

    const applicationsToday = todayApps?.length || 0;
    const dailyLimit = parseInt(process.env.MAX_APPLICATIONS_PER_DAY) || 20;
    const remaining = Math.max(0, dailyLimit - applicationsToday);

    if (remaining === 0) {
      return res.status(429).json({
        success: false,
        error: 'Daily application limit reached',
        dailyLimit,
        applied: applicationsToday
      });
    }

    const jobsToApply = jobIds.slice(0, remaining);
    const results = [];

    for (let i = 0; i < jobsToApply.length; i++) {
      try {
        // Get job details
        const { data: jobDetails } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobsToApply[i])
          .single();

        if (!jobDetails) {
          results.push({ jobId: jobsToApply[i], success: false, error: 'Job not found' });
          continue;
        }

        // Check if already applied
        const { data: existingApp } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', userId)
          .eq('job_id', jobsToApply[i])
          .single();

        if (existingApp) {
          results.push({ jobId: jobsToApply[i], success: false, error: 'Already applied' });
          continue;
        }

        // Create application and queue
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/apply/${jobsToApply[i]}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        const result = await response.json();
        results.push({ jobId: jobsToApply[i], ...result });

        // Add delay between queueing to avoid overwhelming system
        if (i < jobsToApply.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        results.push({ jobId: jobsToApply[i], success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Queued ${successCount} applications`,
      applied: successCount,
      skipped: jobIds.length - successCount,
      dailyLimit,
      remaining: remaining - successCount,
      results
    });

  } catch (error) {
    console.error('❌ Bulk apply error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get application status
router.get('/status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          company_name,
          job_title,
          job_url
        )
      `)
      .eq('id', applicationId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all applications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          company_name,
          job_title,
          job_url,
          fit_score
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
