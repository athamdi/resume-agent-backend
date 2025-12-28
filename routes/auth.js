const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const crypto = require('crypto');

/**
 * Generate simple hash for password
 * Using SHA-256 for demo purposes
 * TODO: Consider bcrypt for production
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, fullName, password } = req.body;
    
    console.log('📝 [AUTH] Registration request received');
    console.log('   Email:', email ? 'present' : 'MISSING');
    console.log('   Full Name:', fullName ? 'present' : 'not provided');
    console.log('   Password:', password ? 'present' : 'MISSING');
    
    // Validation
    if (!email || !password) {
      console.log('   ❌ Validation failed: Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required',
        message: 'Please provide both email and password'
      });
    }
    
    if (password.length < 6) {
      console.log('   ❌ Validation failed: Password too short');
      return res.status(400).json({ 
        success: false, 
        error: 'Password too short',
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('   ❌ Validation failed: Invalid email format');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }
    
    console.log('   ✓ Validation passed');
    console.log(`   📧 Registering: ${email}`);
    console.log('   🔍 Checking if user exists...');
    
    // Check if user already exists - FIXED: Don't use .single() for checking existence
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle(); // Use maybeSingle() instead of single() - won't error if not found
    
    // Only throw if it's a real database error, not "not found"
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('   ❌ Database error during user check:', checkError.message);
      console.log('      Error code:', checkError.code);
      console.log('      Error details:', checkError.details);
      throw checkError;
    }
    
    if (existing) {
      console.log(`   ⚠️  User already exists: ${email}`);
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    console.log('   ✓ User does not exist, proceeding with creation...');
    
    // Create user
    console.log('   💾 Inserting user into database...');
    const userData = {
      email: email.toLowerCase(), 
      full_name: fullName || email.split('@')[0],
      password_hash: hashPassword(password),
      created_at: new Date().toISOString()
    };
    
    console.log('   User data:', {
      email: userData.email,
      full_name: userData.full_name,
      password_hash: userData.password_hash.substring(0, 10) + '...',
      created_at: userData.created_at
    });
    
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (insertError) {
      console.error('   ❌ Database insertion failed:', insertError.message);
      console.error('      Error code:', insertError.code);
      console.error('      Error details:', insertError.details);
      console.error('      Error hint:', insertError.hint);
      
      // Check if it's a missing column error
      if (insertError.code === '42703' || insertError.message.includes('password_hash')) {
        return res.status(500).json({
          success: false,
          error: 'Database schema error',
          message: 'The password_hash column is missing. Run: ALTER TABLE users ADD COLUMN password_hash TEXT;'
        });
      }
      
      throw insertError;
    }
    
    console.log('   ✓ User created in database');
    console.log('      User ID:', user.id);
    console.log('      Email:', user.email);
    
    // Generate JWT token
    console.log('   🔑 Generating JWT token...');
    const token = generateToken(user);
    console.log('   ✓ Token generated:', token.substring(0, 20) + '...');
    
    console.log('   ✅ REGISTRATION SUCCESSFUL\n');
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
    
  } catch (error) {
    console.error('\n❌ [AUTH] REGISTRATION ERROR:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
    console.error('');
    
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required',
        message: 'Please provide both email and password'
      });
    }
    
    console.log(`🔑 [AUTH] Login attempt for: ${email}`);
    
    // Find user with matching email and password
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password_hash', hashPassword(password))
      .single();
    
    if (error || !user) {
      console.log(`❌ [AUTH] Invalid credentials for: ${email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    console.log(`✅ [AUTH] User logged in successfully: ${user.id}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
    
  } catch (error) {
    console.error('❌ [AUTH] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Requires: Authorization header with valid JWT
 */
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    console.log(`👤 [AUTH] Fetching user info for: ${req.userId}`);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', req.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found',
        message: 'User account does not exist'
      });
    }
    
    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ [AUTH] Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user',
      message: error.message 
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', require('../middleware/auth'), (req, res) => {
  console.log(`👋 [AUTH] User logged out: ${req.userId}`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
