require('dotenv').config();
const geminiService = require('./services/gemini');

async function test() {
  console.log('Testing AI Service with Auto-Fallback...\n');
  
  // Show provider status
  const status = geminiService.getProviderStatus();
  console.log('📊 Provider Status:', JSON.stringify(status, null, 2), '\n');
  
  const sampleCV = `
  John Doe
  john.doe@email.com | +1-234-567-8900
  
  EXPERIENCE:
  Software Engineer at Google (2020-2023)
  - Built scalable microservices using Node.js and Python
  - Improved API response time by 40%
  
  EDUCATION:
  B.S. Computer Science, MIT, 2020
  
  SKILLS: JavaScript, Python, React, AWS
  `;
  
  try {
    const analysis = await geminiService.analyzeCv(sampleCV);
    console.log('✅ CV Analysis Result:');
    console.log(JSON.stringify(analysis, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();