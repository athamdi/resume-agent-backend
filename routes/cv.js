const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const geminiService = require('../services/gemini');

// Upload and analyze CV (requires authentication)
router.post('/upload', auth, async (req, res) => {
  try {
    const { cvText } = req.body;
    const userId = req.userId; // From auth middleware
    
    console.log('📝 [CV] Upload attempt for user:', userId);

    if (!cvText) {
      console.log('   ❌ Missing CV text');
      return res.status(400).json({ 
        success: false,
        error: 'CV text is required' 
      });
    }

    // Analyze CV using AI
    console.log('   🤖 Analyzing CV with Gemini...');
    const analyzedData = await geminiService.analyzeCv(cvText);
    console.log('   ✓ Analysis complete:', analyzedData.name);

    console.log('   💾 Saving to database...');
    
    // Check if CV already exists for upsert
    const { data: existingCv } = await supabase
      .from('cv_data')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    let cvData;
    
    if (existingCv) {
      // Update existing CV (excluding experience_level until column is added)
      const { data, error } = await supabase
        .from('cv_data')
        .update({
          cv_text: cvText,
          full_name: analyzedData.name,
          email: analyzedData.email,
          phone: analyzedData.phone,
          skills: analyzedData.skills,
          experience: analyzedData.experience,
          education: analyzedData.education,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      cvData = data;
      console.log('   ✓ CV updated');
    } else {
      // Insert new CV (excluding experience_level until column is added)
      const { data, error } = await supabase
        .from('cv_data')
        .insert({
          user_id: userId,
          cv_text: cvText,
          full_name: analyzedData.name,
          email: analyzedData.email,
          phone: analyzedData.phone,
          skills: analyzedData.skills,
          experience: analyzedData.experience,
          education: analyzedData.education
        })
        .select()
        .single();
      
      if (error) throw error;
      cvData = data;
      console.log('   ✓ CV inserted');
    }
    
    console.log('   ✅ CV upload successful\n');

    res.json({
      success: true,
      cv: cvData,
      analysis: analyzedData
    });

  } catch (error) {
    console.error('   ❌ CV upload error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || 'CV upload failed'
    });
  }
});

// Analyze CV without saving (no auth required for demo)
router.post('/analyze', async (req, res) => {
  try {
    const { cvText } = req.body;
    
    console.log('📝 [CV] Analyze request (no save)');

    if (!cvText) {
      return res.status(400).json({ 
        success: false,
        error: 'CV text is required' 
      });
    }

    // Analyze CV using AI
    console.log('   🤖 Analyzing CV...');
    const analyzedData = await geminiService.analyzeCv(cvText);
    console.log('   ✓ Analysis complete');

    res.json({
      success: true,
      ...analyzedData
    });

  } catch (error) {
    console.error('   ❌ Analyze error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || 'CV analysis failed'
    });
  }
});

// Get current user's CV (protected)
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('📝 [CV] Get CV for user:', userId);

    const { data: cvData, error } = await supabase
      .from('cv_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!cvData) {
      console.log('   ⚠️  No CV found for user');
      return res.status(404).json({ 
        success: false,
        error: 'CV not found for this user' 
      });
    }
    
    console.log('   ✓ CV found');

    res.json({
      success: true,
      cv: cvData
    });
  } catch (error) {
    console.error('   ❌ Get CV error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to fetch CV'
    });
  }
});

module.exports = router;
