require('dotenv').config();
const playwrightService = require('./services/playwright');
const path = require('path');

async function testPlaywright() {
  console.log('🎭 Testing Playwright Service...\n');

  // Sample CV data (like what Gemini would extract)
  const cvData = {
    fullName: "John Doe",
    email: "john.doe@email.com",
    phone: "+1-234-567-8900",
    summary: "Software Engineer with 3 years experience",
    skills: {
      technical: ["JavaScript", "Python", "React"],
      soft: ["Communication", "Problem Solving"],
      tools: ["Git", "Docker"]
    },
    experience: [
      {
        company: "Google",
        role: "Software Engineer",
        duration: "2020-2023",
        achievements: ["Built scalable microservices", "Improved API performance by 40%"]
      }
    ],
    education: [
      {
        degree: "B.S. Computer Science",
        institution: "MIT",
        year: "2020"
      }
    ]
  };

  const jobDetails = {
    company: "Test Company",
    title: "Software Engineer",
    description: "Looking for a talented engineer to join our team"
  };

  // Test with a real Greenhouse job (this is a demo URL - replace with real one)
  const testJobUrl = "https://boards.greenhouse.io/embed/job_app?token=demo";

  const applicationData = {
    jobUrl: testJobUrl,
    cvData: cvData,
    jobDetails: jobDetails,
    resumePdfPath: null // We'll skip resume upload for now
  };

  try {
    console.log(`📍 Testing job URL: ${testJobUrl}`);
    console.log('⏳ This will open a browser and test the automation...\n');

    const result = await playwrightService.applyToJob(applicationData);

    console.log('\n✅ Test Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n🎉 SUCCESS! Playwright automation is working!');
      console.log(`📸 Screenshot saved: ${result.screenshotPath}`);
      console.log(`🔗 Platform detected: ${result.platform}`);
    } else {
      console.log('\n⚠️ Test completed but with issues');
      console.log(`Error: ${result.error}`);
    }

    // Clean up
    await playwrightService.close();

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n✨ Test complete!');
  process.exit(0);
}

// Run test
testPlaywright();