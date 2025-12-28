const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

/**
 * GET /api/analytics/stats
 * Get comprehensive user statistics
 * Requires: Authentication
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log(`📊 [ANALYTICS] Fetching stats for user: ${userId}`);
    
    // Get all applications for the user
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        application_date,
        jobs (
          company_name,
          job_title
        )
      `)
      .eq('user_id', userId);
    
    if (appsError) {
      console.error('❌ [ANALYTICS] Error fetching applications:', appsError);
      throw appsError;
    }
    
    const applications = apps || [];
    
    // Calculate statistics
    const today = new Date().toISOString().split('T')[0];
    const todayApps = applications.filter(a => 
      a.created_at && a.created_at.startsWith(today)
    );
    
    const stats = {
      total: applications.length,
      pending: applications.filter(a => 
        a.status === 'pending' || a.status === 'queued'
      ).length,
      processing: applications.filter(a => 
        a.status === 'processing'
      ).length,
      completed: applications.filter(a => 
        a.status === 'completed'
      ).length,
      failed: applications.filter(a => 
        a.status === 'failed'
      ).length,
      todayCount: todayApps.length,
      remainingToday: Math.max(0, 20 - todayApps.length),
      successRate: applications.length > 0 
        ? Math.round((applications.filter(a => a.status === 'completed').length / applications.length) * 100)
        : 0
    };
    
    // Get recent applications (last 10)
    const recentApplications = applications
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(app => ({
        id: app.id,
        status: app.status,
        createdAt: app.created_at,
        applicationDate: app.application_date,
        company: app.jobs?.company_name || 'Unknown',
        jobTitle: app.jobs?.job_title || 'Unknown'
      }));
    
    // Get top companies applied to
    const companyCounts = {};
    applications.forEach(app => {
      const company = app.jobs?.company_name;
      if (company) {
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      }
    });
    
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));
    
    // Get applications by day (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayApps = applications.filter(a => 
        a.created_at && a.created_at.startsWith(dateStr)
      );
      
      last7Days.push({
        date: dateStr,
        count: dayApps.length,
        completed: dayApps.filter(a => a.status === 'completed').length
      });
    }
    
    console.log(`✅ [ANALYTICS] Stats calculated: ${stats.total} total applications`);
    
    res.json({
      success: true,
      stats,
      recentApplications,
      topCompanies,
      last7Days
    });
    
  } catch (error) {
    console.error('❌ [ANALYTICS] Stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics',
      message: error.message 
    });
  }
});

/**
 * GET /api/analytics/timeline
 * Get application timeline for user
 * Requires: Authentication
 */
router.get('/timeline', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    
    console.log(`📅 [ANALYTICS] Fetching timeline for user: ${userId}`);
    
    // Get applications with job details
    const { data: timeline, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        application_date,
        screenshot_path,
        error_message,
        jobs (
          id,
          company_name,
          job_title,
          location,
          application_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ [ANALYTICS] Error fetching timeline:', error);
      throw error;
    }
    
    // Format timeline data
    const formattedTimeline = (timeline || []).map(item => ({
      id: item.id,
      status: item.status,
      createdAt: item.created_at,
      applicationDate: item.application_date,
      screenshotPath: item.screenshot_path,
      errorMessage: item.error_message,
      job: item.jobs ? {
        id: item.jobs.id,
        company: item.jobs.company_name,
        title: item.jobs.job_title,
        location: item.jobs.location,
        url: item.jobs.application_url
      } : null
    }));
    
    console.log(`✅ [ANALYTICS] Timeline fetched: ${formattedTimeline.length} items`);
    
    res.json({ 
      success: true, 
      timeline: formattedTimeline,
      count: formattedTimeline.length
    });
    
  } catch (error) {
    console.error('❌ [ANALYTICS] Timeline error:', error);
    
    // If it's just empty timeline, return success with empty array
    if (error.message?.includes('applications') || error.code === 'PGRST116') {
      console.log('   ℹ️  No applications found, returning empty timeline');
      return res.json({ 
        success: true, 
        timeline: [],
        count: 0
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch timeline',
      message: error.message 
    });
  }
});

/**
 * GET /api/analytics/summary
 * Get quick summary of user activity
 * Requires: Authentication
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log(`📈 [ANALYTICS] Fetching summary for user: ${userId}`);
    
    // Get counts from different tables
    const [cvResult, jobsResult, appsResult] = await Promise.all([
      supabase.from('cv_data').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('applications').select('id, status', { count: 'exact' }).eq('user_id', userId)
    ]);
    
    const summary = {
      cvUploaded: cvResult.count > 0,
      totalJobs: jobsResult.count || 0,
      totalApplications: appsResult.count || 0,
      activeApplications: (appsResult.data || []).filter(a => 
        a.status === 'pending' || a.status === 'processing' || a.status === 'queued'
      ).length,
      completedApplications: (appsResult.data || []).filter(a => 
        a.status === 'completed'
      ).length
    };
    
    console.log(`✅ [ANALYTICS] Summary fetched`);
    
    res.json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error('❌ [ANALYTICS] Summary error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch summary',
      message: error.message 
    });
  }
});

module.exports = router;
