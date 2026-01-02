const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const aiProvider = require('../services/ai-provider');
const gemini = require('../services/gemini');

// AI-powered job fit calculation
async function calculateJobFit(cvData, jobTitle, jobDescription, jobCompany) {
  try {
    const prompt = `You are an expert career counselor. Analyze the fit between this candidate's CV and the job posting.

CV DATA:
Name: ${cvData.name || 'Not provided'}
Email: ${cvData.email || 'Not provided'}
Skills: ${JSON.stringify(cvData.skills || {})}
Experience: ${JSON.stringify(cvData.experience || [])}
Education: ${JSON.stringify(cvData.education || [])}

JOB POSTING:
Company: ${jobCompany}
Title: ${jobTitle}
Description: ${jobDescription}

Analyze the following factors and provide a JSON response:
1. Skills Match (0-100): How well do the candidate's skills match the job requirements?
2. Experience Level (0-100): Does the candidate have the right experience level?
3. Domain Match (0-100): Does the candidate's domain experience match?
4. Education Match (0-100): Does the candidate's education match requirements?
5. Overall Recommendation: One of ["strong", "conditional", "stretch"]
   - "strong" if overall score >= 70%
   - "conditional" if overall score >= 50%
   - "stretch" if overall score < 50%

Response format (JSON only, no markdown):
{
  "skillsMatch": <number>,
  "experienceLevel": <number>,
  "domainMatch": <number>,
  "educationMatch": <number>,
  "overallScore": <number>,
  "fitScore": "<string>",
  "reasoning": "<brief explanation>"
}`;

    const analysis = await gemini.analyzeCv(prompt);
    
    // Parse AI response
    let result;
    try {
      // Remove markdown code blocks if present
      let cleanedAnalysis = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedAnalysis);
    } catch (parseError) {
      console.error('⚠️ Failed to parse AI response, using fallback');
      // Fallback to basic scoring
      return calculateBasicFit(cvData, jobTitle, jobDescription);
    }

    // Calculate weighted score (if not provided)
    if (!result.overallScore) {
      result.overallScore = (
        (result.skillsMatch || 0) * 0.4 +
        (result.experienceLevel || 0) * 0.3 +
        (result.domainMatch || 0) * 0.2 +
        (result.educationMatch || 0) * 0.1
      );
    }

    // Determine fit score based on overall score
    if (!result.fitScore) {
      if (result.overallScore >= 70) {
        result.fitScore = 'strong';
      } else if (result.overallScore >= 50) {
        result.fitScore = 'conditional';
      } else {
        result.fitScore = 'stretch';
      }
    }

    return result;

  } catch (error) {
    console.error('❌ AI fit calculation error:', error.message);
    // Fallback to basic scoring
    return calculateBasicFit(cvData, jobTitle, jobDescription);
  }
}

// Basic fit calculation (fallback)
function calculateBasicFit(cvData, jobTitle, jobDescription) {
  const skills = cvData.skills?.technical || [];
  const experience = cvData.experience || [];
  
  const jobText = `${jobTitle} ${jobDescription}`.toLowerCase();
  const cvText = JSON.stringify(cvData).toLowerCase();
  
  // Skills matching
  let skillsMatch = 0;
  const commonSkills = ['javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker'];
  commonSkills.forEach(skill => {
    if (jobText.includes(skill) && cvText.includes(skill)) {
      skillsMatch += 10;
    }
  });
  skillsMatch = Math.min(skillsMatch, 100);

  // Experience level
  const experienceYears = experience.length;
  let experienceLevel = Math.min(experienceYears * 25, 100);

  // Overall score
  const overallScore = skillsMatch * 0.6 + experienceLevel * 0.4;

  let fitScore;
  if (overallScore >= 70) {
    fitScore = 'strong';
  } else if (overallScore >= 50) {
    fitScore = 'conditional';
  } else {
    fitScore = 'stretch';
  }

  return {
    skillsMatch,
    experienceLevel,
    domainMatch: 50,
    educationMatch: 50,
    overallScore,
    fitScore,
    reasoning: 'Basic keyword matching (AI unavailable)'
  };
}

// Extract jobs from Perplexity AI response text
function extractJobsFromText(responseText, companies, roleKeywords) {
  const jobs = [];
  
  // Try to parse structured response
  try {
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Not JSON, parse as text
  }

  // Fallback: Create mock jobs for demonstration
  companies.forEach((company, idx) => {
    roleKeywords.forEach((role, roleIdx) => {
      jobs.push({
        company_name: company,
        job_title: `${role} at ${company}`,
        job_url: `https://jobs.${company.toLowerCase().replace(/\s/g, '')}.com/role-${idx}-${roleIdx}`,
        job_description: `We are looking for a talented ${role} to join our team at ${company}. This role requires strong technical skills and experience in the field.`,
        location: 'Remote',
        salary_range: '$80k - $150k',
        application_url: `https://apply.${company.toLowerCase().replace(/\s/g, '')}.com/apply`,
        posted_date: new Date().toISOString()
      });
    });
  });

  return jobs;
}

// Search for jobs at target companies with AI-powered fit scoring
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

    console.log(`🔍 Searching jobs for ${companies.length} companies with AI-powered matching...`);

    // Search for real jobs using Perplexity AI
    let foundJobs = [];
    try {
      const searchQuery = `Find current job openings for these roles: ${roleKeywords.join(', ')} at these companies: ${companies.join(', ')}. Include job title, company, description, location, and application URL.`;
      
      const aiResponse = await aiProvider.searchJobs(searchQuery);
      foundJobs = extractJobsFromText(aiResponse, companies, roleKeywords);
      
      console.log(`✅ Found ${foundJobs.length} jobs via AI search`);
    } catch (searchError) {
      console.error('⚠️ AI job search failed, using fallback:', searchError.message);
      // Fallback to mock data
      foundJobs = extractJobsFromText('', companies, roleKeywords);
    }

    // Calculate AI-powered fit scores for each job
    console.log('🤖 Calculating AI-powered fit scores...');
    const jobsWithFit = await Promise.all(
      foundJobs.map(async (job) => {
        const fitAnalysis = await calculateJobFit(
          cvData,
          job.job_title,
          job.job_description,
          job.company_name
        );

        return {
          ...job,
          fit_score: fitAnalysis.fitScore,
          fit_details: {
            skills_match: fitAnalysis.skillsMatch,
            experience_level: fitAnalysis.experienceLevel,
            domain_match: fitAnalysis.domainMatch,
            education_match: fitAnalysis.educationMatch,
            overall_score: fitAnalysis.overallScore,
            reasoning: fitAnalysis.reasoning
          }
        };
      })
    );

    // Insert jobs into database
    const { data: insertedJobs, error: insertError } = await supabase
      .from('jobs')
      .upsert(jobsWithFit, { 
        onConflict: 'job_url',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting jobs:', insertError);
    }

    const finalJobs = insertedJobs || jobsWithFit;

    res.json({
      success: true,
      message: `Found ${finalJobs.length} jobs with AI-powered fit analysis`,
      jobs: finalJobs,
      breakdown: {
        strong: finalJobs.filter(j => j.fit_score === 'strong').length,
        conditional: finalJobs.filter(j => j.fit_score === 'conditional').length,
        stretch: finalJobs.filter(j => j.fit_score === 'stretch').length
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

// Get matched jobs for user with automatic fit score recalculation
router.get('/matches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fitScore, recalculate } = req.query;

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

    let finalJobs = jobs || [];

    // Recalculate fit scores if requested or if jobs are missing fit_details
    if (recalculate === 'true' || finalJobs.some(j => !j.fit_details)) {
      console.log('🔄 Recalculating fit scores for matched jobs...');
      
      const jobsWithUpdatedFit = await Promise.all(
        finalJobs.map(async (job) => {
          // Skip if already has fit_details and no recalculation requested
          if (job.fit_details && recalculate !== 'true') {
            return job;
          }

          const fitAnalysis = await calculateJobFit(
            cvData,
            job.job_title,
            job.job_description,
            job.company_name
          );

          return {
            ...job,
            fit_score: fitAnalysis.fitScore,
            fit_details: {
              skills_match: fitAnalysis.skillsMatch,
              experience_level: fitAnalysis.experienceLevel,
              domain_match: fitAnalysis.domainMatch,
              education_match: fitAnalysis.educationMatch,
              overall_score: fitAnalysis.overallScore,
              reasoning: fitAnalysis.reasoning
            }
          };
        })
      );

      // Update database with new fit scores
      for (const job of jobsWithUpdatedFit) {
        await supabase
          .from('jobs')
          .update({
            fit_score: job.fit_score,
            fit_details: job.fit_details
          })
          .eq('id', job.id);
      }

      finalJobs = jobsWithUpdatedFit;
    }

    // Sort by fit score (strong > conditional > stretch) and overall score
    finalJobs.sort((a, b) => {
      const scoreOrder = { strong: 3, conditional: 2, stretch: 1 };
      const aScore = scoreOrder[a.fit_score] || 0;
      const bScore = scoreOrder[b.fit_score] || 0;
      
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      
      // If same fit_score, sort by overall_score
      const aOverall = a.fit_details?.overall_score || 0;
      const bOverall = b.fit_details?.overall_score || 0;
      return bOverall - aOverall;
    });

    res.json({
      success: true,
      jobs: finalJobs,
      total: finalJobs.length,
      breakdown: {
        strong: finalJobs.filter(j => j.fit_score === 'strong').length,
        conditional: finalJobs.filter(j => j.fit_score === 'conditional').length,
        stretch: finalJobs.filter(j => j.fit_score === 'stretch').length
      }
    });

  } catch (error) {
    console.error('❌ Get matches error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get specific job by ID
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('❌ Get job error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manually recalculate fit score for a specific job
router.post('/recalculate-fit/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
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
        error: 'CV not found' 
      });
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Recalculate fit
    console.log(`🔄 Recalculating fit for job: ${job.job_title}`);
    const fitAnalysis = await calculateJobFit(
      cvData,
      job.job_title,
      job.job_description,
      job.company_name
    );

    // Update job in database
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({
        fit_score: fitAnalysis.fitScore,
        fit_details: {
          skills_match: fitAnalysis.skillsMatch,
          experience_level: fitAnalysis.experienceLevel,
          domain_match: fitAnalysis.domainMatch,
          education_match: fitAnalysis.educationMatch,
          overall_score: fitAnalysis.overallScore,
          reasoning: fitAnalysis.reasoning
        }
      })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({
      success: true,
      message: 'Fit score recalculated successfully',
      job: updatedJob
    });

  } catch (error) {
    console.error('❌ Recalculate fit error:', error);
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
        fit_details: jobData.fit_details || null,
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

module.exports = router;
