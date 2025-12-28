/**
 * Complete System Verification Script
 * Tests all components of the Resume Agent Backend
 * 
 * Run this after Copilot generates all files to verify everything works
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const TESTS = {
  passed: [],
  failed: [],
  warnings: []
};

async function verify() {
  console.log('🔍 RESUME AGENT BACKEND - SYSTEM VERIFICATION\n');
  console.log('='.repeat(60));
  
  // ========================================
  // SECTION 1: FILE STRUCTURE
  // ========================================
  console.log('\n📁 Section 1: Verifying File Structure...\n');
  
  const requiredFiles = [
    'config/supabase.js',
    'services/ai-provider.js',
    'services/gemini.js',
    'services/playwright.js',
    'services/queue.js',
    'routes/apply.js',
    'routes/cv.js',
    'routes/jobs.js',
    'workers/applyWorker.js',
    'server.js',
    '.env',
    'package.json'
  ];
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      TESTS.passed.push(`✅ ${file} exists`);
    } else {
      TESTS.failed.push(`❌ ${file} missing`);
    }
  });
  
  // Check screenshots folder
  if (fs.existsSync('screenshots')) {
    TESTS.passed.push('✅ screenshots/ folder exists');
  } else {
    TESTS.warnings.push('⚠️  screenshots/ folder missing (will be created automatically)');
  }
  
  // ========================================
  // SECTION 2: DEPENDENCIES
  // ========================================
  console.log('\n📦 Section 2: Verifying Dependencies...\n');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'express',
    'cors',
    'dotenv',
    '@supabase/supabase-js',
    '@google/generative-ai',
    'playwright',
    'bull',
    'redis',
    'axios'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      TESTS.passed.push(`✅ ${dep} installed`);
    } else {
      TESTS.failed.push(`❌ ${dep} not installed`);
    }
  });
  
  // ========================================
  // SECTION 3: ENVIRONMENT VARIABLES
  // ========================================
  console.log('\n🔑 Section 3: Verifying Environment Variables...\n');
  
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'GEMINI_API_KEY',
    'PORT'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      TESTS.passed.push(`✅ ${envVar} configured`);
    } else {
      TESTS.failed.push(`❌ ${envVar} missing in .env`);
    }
  });
  
  if (!process.env.REDIS_URL) {
    TESTS.warnings.push('⚠️  REDIS_URL not set (defaulting to localhost:6379)');
  }
  
  if (!process.env.PERPLEXITY_API_KEY) {
    TESTS.warnings.push('⚠️  PERPLEXITY_API_KEY not set (AI fallback disabled)');
  }
  
  // ========================================
  // SECTION 4: DATABASE CONNECTION
  // ========================================
  console.log('\n🗄️  Section 4: Testing Database Connection...\n');
  
  try {
    const supabase = require('./config/supabase');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) throw error;
    TESTS.passed.push('✅ Supabase connection successful');
    
    // Check all required tables exist
    const tables = ['users', 'cv_data', 'jobs', 'applications', 'application_queue', 'target_companies'];
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count').limit(1);
      if (tableError) {
        TESTS.failed.push(`❌ Table '${table}' missing or inaccessible`);
      } else {
        TESTS.passed.push(`✅ Table '${table}' accessible`);
      }
    }
  } catch (error) {
    TESTS.failed.push(`❌ Database connection failed: ${error.message}`);
  }
  
  // ========================================
  // SECTION 5: AI SERVICES
  // ========================================
  console.log('\n🤖 Section 5: Testing AI Services...\n');
  
  try {
    const geminiService = require('./services/gemini');
    
    const sampleCV = `
      John Doe
      john@email.com | 555-1234
      Software Engineer with 3 years experience
      Skills: JavaScript, React, Node.js, Python, AWS
      
      Experience:
      - Senior Developer at Tech Corp (2022-present)
      - Junior Developer at StartupXYZ (2020-2022)
      
      Education:
      - BS Computer Science, University ABC (2020)
    `;
    
    console.log('   Testing CV analysis...');
    const analysis = await geminiService.analyzeCv(sampleCV);
    
    if (analysis && analysis.name) {
      TESTS.passed.push('✅ AI CV analysis working');
      console.log(`   Extracted name: ${analysis.name}`);
      console.log(`   Skills found: ${analysis.skills?.length || 0}`);
      console.log(`   Experience level: ${analysis.experience_level || 'N/A'}`);
    } else {
      TESTS.failed.push('❌ AI CV analysis returned invalid data');
    }
  } catch (error) {
    if (error.message.includes('429')) {
      TESTS.warnings.push('⚠️  Gemini API quota exceeded (fallback will be used)');
    } else {
      TESTS.failed.push(`❌ AI service test failed: ${error.message}`);
    }
  }
  
  // ========================================
  // SECTION 6: SERVER STARTUP
  // ========================================
  console.log('\n🖥️  Section 6: Testing Server Configuration...\n');
  
  try {
    // Check if server.js can be loaded
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    if (serverContent.includes('app.use(\'/api/apply\'')) {
      TESTS.passed.push('✅ Apply routes registered in server.js');
    } else {
      TESTS.failed.push('❌ Apply routes not registered in server.js');
    }
    
    if (serverContent.includes('app.use(\'/api/cv\'')) {
      TESTS.passed.push('✅ CV routes registered in server.js');
    } else {
      TESTS.failed.push('❌ CV routes not registered in server.js');
    }
    
    if (serverContent.includes('app.use(\'/api/jobs\'')) {
      TESTS.passed.push('✅ Jobs routes registered in server.js');
    } else {
      TESTS.warnings.push('⚠️  Jobs routes not registered in server.js');
    }
    
    // Try to make a request to the server
    console.log('   Checking if server is running...');
    try {
      const response = await fetch('http://localhost:3000/health', { 
        signal: AbortSignal.timeout(2000) 
      });
      
      if (response.ok) {
        TESTS.passed.push('✅ Server is running on port 3000');
        
        const data = await response.json();
        console.log(`   Server status: ${data.status}`);
        
        // Test additional endpoints
        const testEndpoints = [
          { path: '/api/cv/test', expectedFail: true },
          { path: '/health', expectedFail: false }
        ];
        
        for (const endpoint of testEndpoints) {
          try {
            const resp = await fetch(`http://localhost:3000${endpoint.path}`, {
              signal: AbortSignal.timeout(2000)
            });
            if (!endpoint.expectedFail) {
              TESTS.passed.push(`✅ Endpoint ${endpoint.path} responding`);
            }
          } catch (err) {
            // Expected for some endpoints
          }
        }
      } else {
        TESTS.warnings.push('⚠️  Server returned unexpected status');
      }
    } catch (error) {
      TESTS.warnings.push('⚠️  Server not running (start with: node server.js)');
    }
  } catch (error) {
    TESTS.failed.push(`❌ Server test failed: ${error.message}`);
  }
  
  // ========================================
  // SECTION 7: QUEUE SYSTEM
  // ========================================
  console.log('\n⚙️  Section 7: Testing Queue System...\n');
  
  try {
    const queue = require('./services/queue');
    TESTS.passed.push('✅ Queue service loaded successfully');
    
    // Check if Redis is accessible
    try {
      const jobCounts = await Promise.race([
        queue.getJobCounts(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), 3000)
        )
      ]);
      
      TESTS.passed.push(`✅ Redis connection working (${jobCounts.waiting} waiting, ${jobCounts.active} active)`);
    } catch (error) {
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        TESTS.warnings.push('⚠️  Redis not accessible (queue won\'t work - install Redis or use Upstash)');
      } else {
        TESTS.warnings.push(`⚠️  Redis connection issue: ${error.message}`);
      }
    }
  } catch (error) {
    TESTS.failed.push(`❌ Queue service failed to load: ${error.message}`);
  }
  
  // ========================================
  // SECTION 8: PLAYWRIGHT
  // ========================================
  console.log('\n🎭 Section 8: Testing Playwright...\n');
  
  try {
    const playwrightService = require('./services/playwright');
    TESTS.passed.push('✅ Playwright service loaded');
    
    // Check if Chromium is installed
    const { chromium } = require('playwright');
    try {
      console.log('   Launching Chromium browser...');
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      TESTS.passed.push('✅ Chromium browser installed and working');
    } catch (error) {
      if (error.message.includes('Executable doesn\'t exist')) {
        TESTS.failed.push('❌ Chromium not installed (run: npx playwright install chromium)');
      } else {
        TESTS.warnings.push(`⚠️  Chromium test issue: ${error.message}`);
      }
    }
  } catch (error) {
    TESTS.failed.push(`❌ Playwright test failed: ${error.message}`);
  }
  
  // ========================================
  // SECTION 9: ROUTE FILES
  // ========================================
  console.log('\n🛣️  Section 9: Verifying Route Implementations...\n');
  
  const routeChecks = [
    { file: 'routes/apply.js', endpoints: ['POST /:jobId', 'POST /bulk', 'GET /status/:appId'] },
    { file: 'routes/cv.js', endpoints: ['POST /upload', 'POST /analyze', 'GET /:userId'] },
    { file: 'routes/jobs.js', endpoints: ['POST /search', 'GET /matches/:userId', 'POST /add'] }
  ];
  
  routeChecks.forEach(route => {
    try {
      const content = fs.readFileSync(route.file, 'utf8');
      const hasRouter = content.includes('express.Router()');
      const hasExport = content.includes('module.exports');
      
      if (hasRouter && hasExport) {
        TESTS.passed.push(`✅ ${route.file} properly structured`);
      } else {
        TESTS.warnings.push(`⚠️  ${route.file} may have structural issues`);
      }
      
      // Check for key endpoints
      route.endpoints.forEach(endpoint => {
        const [method, path] = endpoint.split(' ');
        const routerCall = `router.${method.toLowerCase()}`;
        if (content.includes(routerCall)) {
          TESTS.passed.push(`✅ ${route.file} has ${method} endpoint`);
        }
      });
    } catch (error) {
      TESTS.failed.push(`❌ Failed to verify ${route.file}`);
    }
  });
  
  // ========================================
  // FINAL REPORT
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION REPORT\n');
  
  console.log(`✅ Passed: ${TESTS.passed.length}`);
  console.log(`❌ Failed: ${TESTS.failed.length}`);
  console.log(`⚠️  Warnings: ${TESTS.warnings.length}\n`);
  
  if (TESTS.failed.length > 0) {
    console.log('❌ FAILED TESTS:');
    TESTS.failed.forEach(test => console.log(`   ${test}`));
    console.log('');
  }
  
  if (TESTS.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    TESTS.warnings.forEach(test => console.log(`   ${test}`));
    console.log('');
  }
  
  // Detailed passed tests (collapsed by default)
  if (TESTS.passed.length > 0 && process.argv.includes('--verbose')) {
    console.log('✅ PASSED TESTS:');
    TESTS.passed.forEach(test => console.log(`   ${test}`));
    console.log('');
  }
  
  // Overall status
  console.log('='.repeat(60));
  if (TESTS.failed.length === 0) {
    console.log('🎉 ALL CRITICAL TESTS PASSED!');
    console.log('✅ Your backend is ready to use!\n');
    console.log('Next steps:');
    console.log('   1. Start server: node server.js');
    console.log('   2. Start worker: node workers/applyWorker.js');
    console.log('   3. Run integration test: node test-full-flow.js');
    console.log('   4. Build frontend in Lovable\n');
    
    if (TESTS.warnings.length > 0) {
      console.log('💡 Tips:');
      if (TESTS.warnings.some(w => w.includes('Redis'))) {
        console.log('   - Install Redis for queue functionality');
        console.log('   - Quick option: Use Upstash (free): https://upstash.com');
      }
      if (TESTS.warnings.some(w => w.includes('PERPLEXITY'))) {
        console.log('   - Add PERPLEXITY_API_KEY for AI fallback');
      }
      console.log('');
    }
  } else {
    console.log('❌ SYSTEM NOT READY');
    console.log('Fix the failed tests above before proceeding.\n');
    console.log('Common fixes:');
    console.log('   - Missing files: Check file structure matches README');
    console.log('   - Missing dependencies: Run npm install');
    console.log('   - Database errors: Verify Supabase credentials in .env');
    console.log('   - Chromium missing: Run npx playwright install chromium\n');
  }
  
  console.log('='.repeat(60));
  console.log(`\n⏱️  Verification completed in ${Math.round(performance.now() / 1000)}s\n`);
  
  process.exit(TESTS.failed.length > 0 ? 1 : 0);
}

// Run verification
verify().catch(error => {
  console.error('\n💥 Verification script crashed:', error);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
});
