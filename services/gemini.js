const aiProvider = require('./ai-provider');

class GeminiService {
  
  // Helper to clean JSON response
  cleanJsonResponse(response) {
    return response.replace(/```json\n?|\n?```/g, '').trim();
  }

  // Analyze CV and extract structured data
  async analyzeCv(cvText) {
    const prompt = `
You are an expert CV analyzer. Extract structured information from this CV.

CV TEXT:
${cvText}

Return a JSON object with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "2020-2023",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": "2020"
    }
  ],
  "experience_level": "entry or mid or senior"
}

Important: Flatten skills into a simple array. Calculate experience_level based on years of experience:
- entry: 0-2 years
- mid: 2-5 years  
- senior: 5+ years

Return ONLY valid JSON, no markdown or explanations.
`;

    const response = await aiProvider.generate(prompt);
    const cleanJson = this.cleanJsonResponse(response);
    const parsed = JSON.parse(cleanJson);
    
    // Ensure required fields are present
    if (!parsed.name) {
      throw new Error('AI did not return required field: name');
    }
    
    return parsed;
  }

  // Generate application answers for a specific job
  async generateApplicationAnswers(cvData, jobDescription, formQuestions) {
    const prompt = `
You are helping a candidate apply to a job. Generate personalized, professional answers.

CANDIDATE INFO:
${JSON.stringify(cvData, null, 2)}

JOB DESCRIPTION:
${jobDescription}

FORM QUESTIONS:
${JSON.stringify(formQuestions, null, 2)}

For each question, provide a tailored answer that:
- Connects the candidate's experience to the job requirements
- Is concise (50-200 words per answer)
- Uses specific examples from their CV
- Shows genuine interest in the role

Return JSON array:
[
  {
    "question": "original question",
    "answer": "your generated answer",
    "fieldType": "textarea|input|select"
  }
]

Return ONLY valid JSON, no markdown.
`;

    const response = await aiProvider.generate(prompt);
    const cleanJson = this.cleanJsonResponse(response);
    return JSON.parse(cleanJson);
  }

  // Generate cover letter
  async generateCoverLetter(cvData, jobDetails) {
    const prompt = `
Write a professional cover letter for this job application.

CANDIDATE:
Name: ${cvData.fullName}
Background: ${cvData.summary}
Key Skills: ${cvData.skills.technical.join(', ')}
Recent Experience: ${JSON.stringify(cvData.experience[0])}

JOB:
Company: ${jobDetails.company}
Role: ${jobDetails.title}
Description: ${jobDetails.description}

Write a 3-paragraph cover letter (250-300 words):
1. Opening: Why you're excited about this specific role
2. Body: 2-3 relevant achievements that match job requirements
3. Closing: Call to action

Use professional but warm tone. Be specific, not generic.
Return only the letter text, no formatting or labels.
`;

    const response = await aiProvider.generate(prompt);
    return response.trim();
  }

  // Analyze form structure
  async analyzeFormStructure(formHtml) {
    const prompt = `
Analyze this job application form HTML and identify what information is needed.

HTML:
${formHtml}

Return JSON array of fields:
[
  {
    "fieldName": "CSS selector for field",
    "label": "human readable label",
    "type": "text|email|tel|textarea|select|file",
    "required": true|false,
    "purpose": "firstName|lastName|email|phone|coverLetter|resume|customQuestion"
  }
]

Return ONLY valid JSON.
`;

    const response = await aiProvider.generate(prompt);
    const cleanJson = this.cleanJsonResponse(response);
    return JSON.parse(cleanJson);
  }

  // Get AI provider status
  getProviderStatus() {
    return aiProvider.getStatus();
  }
}

module.exports = new GeminiService();