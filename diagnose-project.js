require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n🔍 COMPREHENSIVE PROJECT DIAGNOSTIC\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const requiredFiles = {
  critical: [
    'server.js',
    'package.json',
    '.env',
    'config/supabase.js',
    'middleware/auth.js',
    'routes/auth.js',
    'routes/cv.js',
    'routes/apply.js',
    'routes/analytics.js',
    'routes/jobs.js',
    'services/gemini.js',
    'services/ai-provider.js',
    'services/playwright.js',
    'services/queue.js',
    'services/notifications.js',
    'workers/applyWorker.js'
  ],
  folders: [
    'config',
    'middleware',
    'routes',
    'services',
    'workers',
    'screenshots',
    'frontend-integration'
  ]
};

let totalScore = 0;
let maxScore = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK FILES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('📁 CHECKING CRITICAL FILES\n');

requiredFiles.critical.forEach(file => {
  maxScore++;
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    console.log(`✅ ${file.padEnd(40)} (${size} bytes)`);
    totalScore++;
  } else {
    console.log(`❌ ${file.padEnd(40)} MISSING`);
  }
});

console.log('\n📂 CHECKING FOLDERS\n');

requiredFiles.folders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  const exists = fs.existsSync(folderPath);
  
  if (exists) {
    const files = fs.readdirSync(folderPath);
    console.log(`✅ ${folder.padEnd(30)} (${files.length} files)`);
  } else {
    console.log(`❌ ${folder.padEnd(30)} MISSING`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK ENVIRONMENT VARIABLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🔐 CHECKING ENVIRONMENT VARIABLES\n');

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GEMINI_API_KEY',
  'JWT_SECRET',
  'PORT',
  'REDIS_URL',
  'PERPLEXITY_API_KEY',
  'MAX_APPLICATIONS_PER_DAY',
  'APPLICATION_DELAY_MS'
];

let envScore = 0;

requiredEnv.forEach(key => {
  if (process.env[key]) {
    const value = process.env[key];
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`✅ ${key.padEnd(30)} ${preview}`);
    envScore++;
  } else {
    console.log(`❌ ${key.padEnd(30)} NOT SET`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST MODULE IMPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📦 TESTING MODULE IMPORTS\n');

const modules = [
  { name: 'Supabase Config', path: './config/supabase.js' },
  { name: 'Auth Middleware', path: './middleware/auth.js' },
  { name: 'Gemini Service', path: './services/gemini.js' },
  { name: 'AI Provider', path: './services/ai-provider.js' },
  { name: 'Playwright Service', path: './services/playwright.js' },
  { name: 'Queue Service', path: './services/queue.js' },
  { name: 'Auth Routes', path: './routes/auth.js' },
  { name: 'CV Routes', path: './routes/cv.js' },
  { name: 'Jobs Routes', path: './routes/jobs.js' },
  { name: 'Apply Routes', path: './routes/apply.js' },
  { name: 'Analytics Routes', path: './routes/analytics.js' }
];

let importScore = 0;

modules.forEach(({ name, path: modulePath }) => {
  try {
    require(modulePath);
    console.log(`✅ ${name.padEnd(25)} imports successfully`);
    importScore++;
  } catch (error) {
    console.log(`❌ ${name.padEnd(25)} ERROR: ${error.message.substring(0, 50)}`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK DEPENDENCIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n📚 CHECKING NPM DEPENDENCIES\n');

const requiredDeps = [
  'express',
  'cors',
  'dotenv',
  '@supabase/supabase-js',
  '@google/generative-ai',
  'playwright',
  'jsonwebtoken',
  'bull',
  'ioredis',
  'axios'
];

const packageJson = require('./package.json');
const installedDeps = packageJson.dependencies || {};

let depsScore = 0;

requiredDeps.forEach(dep => {
  if (installedDeps[dep]) {
    console.log(`✅ ${dep.padEnd(30)} ${installedDeps[dep]}`);
    depsScore++;
  } else {
    console.log(`❌ ${dep.padEnd(30)} NOT INSTALLED`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATABASE CONNECTION TEST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🗄️  TESTING DATABASE CONNECTION\n');

(async () => {
  try {
    const supabase = require('./config/supabase');
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase connection successful');
    
    // Check tables exist
    const tables = ['users', 'cv_data', 'jobs', 'applications'];
    console.log('\n📊 CHECKING DATABASE TABLES\n');
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) throw tableError;
        console.log(`✅ Table '${table}' exists`);
      } catch (err) {
        console.log(`❌ Table '${table}' missing or inaccessible`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REDIS CONNECTION TEST
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('\n🔴 TESTING REDIS CONNECTION\n');

  try {
    const queue = require('./services/queue');
    const stats = await Promise.race([
      queue.getJobCounts(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    
    console.log('✅ Redis connection successful');
    console.log(`   Active jobs: ${stats.active || 0}`);
    console.log(`   Waiting jobs: ${stats.waiting || 0}`);
    console.log(`   Completed: ${stats.completed || 0}`);
  } catch (error) {
    console.log(`⚠️  Redis connection failed (optional): ${error.message}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FINAL SCORE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const fileHealth = Math.round((totalScore / maxScore) * 100);
  const envHealth = Math.round((envScore / requiredEnv.length) * 100);
  const importHealth = Math.round((importScore / modules.length) * 100);
  const depsHealth = Math.round((depsScore / requiredDeps.length) * 100);

  console.log(`📁 Files:         ${fileHealth}% (${totalScore}/${maxScore})`);
  console.log(`🔐 Environment:   ${envHealth}% (${envScore}/${requiredEnv.length})`);
  console.log(`📦 Imports:       ${importHealth}% (${importScore}/${modules.length})`);
  console.log(`📚 Dependencies:  ${depsHealth}% (${depsScore}/${requiredDeps.length})`);

  const overallHealth = Math.round((fileHealth + envHealth + importHealth + depsHealth) / 4);
  
  console.log(`\n🎯 OVERALL HEALTH: ${overallHealth}%`);
  
  if (overallHealth >= 90) {
    console.log('   🎉 Excellent! Project is production-ready.');
  } else if (overallHealth >= 75) {
    console.log('   ✅ Good! Minor fixes may be needed.');
  } else if (overallHealth >= 50) {
    console.log('   ⚠️  Fair. Several issues need attention.');
  } else {
    console.log('   ❌ Critical issues found. Immediate action required.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
})();
