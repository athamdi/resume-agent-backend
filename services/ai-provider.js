const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIProvider {
  constructor() {
    this.geminiClient = process.env.GEMINI_API_KEY 
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
      : null;
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    this.currentProvider = 'gemini'; // 'gemini' or 'perplexity'
    this.quotaExceededUntil = null;
  }

  // Check if we should use fallback
  shouldUseFallback() {
    if (this.quotaExceededUntil && Date.now() < this.quotaExceededUntil) {
      return true;
    }
    this.quotaExceededUntil = null;
    return false;
  }

  // Mark quota as exceeded (fallback for 1 hour)
  markQuotaExceeded() {
    this.quotaExceededUntil = Date.now() + (60 * 60 * 1000); // 1 hour
    console.log('⚠️ Gemini quota exceeded, switching to Perplexity for 1 hour');
  }

  // Generate content using Gemini
  async generateWithGemini(prompt) {
    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  // Generate content using Perplexity
  async generateWithPerplexity(prompt) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Perplexity API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Main generate function with automatic fallback
  async generate(prompt) {
    // Check if we should use fallback due to previous quota error
    if (this.shouldUseFallback() && this.perplexityApiKey) {
      console.log('🔄 Using Perplexity (Gemini quota exceeded)');
      return await this.generateWithPerplexity(prompt);
    }

    // Try Gemini first
    if (this.geminiClient) {
      try {
        return await this.generateWithGemini(prompt);
      } catch (error) {
        // Check if it's a quota error (429)
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          this.markQuotaExceeded();
          
          // Fallback to Perplexity if available
          if (this.perplexityApiKey) {
            console.log('🔄 Falling back to Perplexity');
            return await this.generateWithPerplexity(prompt);
          }
        }
        throw error;
      }
    }

    // Use Perplexity if Gemini not configured
    if (this.perplexityApiKey) {
      return await this.generateWithPerplexity(prompt);
    }

    throw new Error('No AI provider configured. Set GEMINI_API_KEY or PERPLEXITY_API_KEY');
  }

  // Get current provider status
  getStatus() {
    return {
      geminiConfigured: !!this.geminiClient,
      perplexityConfigured: !!this.perplexityApiKey,
      currentProvider: this.shouldUseFallback() ? 'perplexity' : 'gemini',
      quotaExceededUntil: this.quotaExceededUntil 
        ? new Date(this.quotaExceededUntil).toISOString() 
        : null
    };
  }

  // Search for jobs using Perplexity AI (real-time search)
  async searchJobs(query) {
    // Prefer Perplexity for job searches (real-time data)
    if (this.perplexityApiKey) {
      try {
        console.log('🔍 Searching jobs with Perplexity AI...');
        const searchPrompt = `${query}

Please provide a list of current job openings with the following format for each job:
- Company Name
- Job Title
- Location
- Job Description (brief)
- Application URL (if available)

Focus on recent and active postings.`;

        return await this.generateWithPerplexity(searchPrompt);
      } catch (error) {
        console.error('⚠️ Perplexity job search failed:', error.message);
        // Fallback to Gemini
        if (this.geminiClient) {
          console.log('🔄 Falling back to Gemini for job search');
          return await this.generateWithGemini(query);
        }
        throw error;
      }
    }

    // Use Gemini if Perplexity not available (less accurate for real-time jobs)
    if (this.geminiClient) {
      console.log('⚠️ Using Gemini for job search (may not have real-time data)');
      return await this.generateWithGemini(query);
    }

    throw new Error('No AI provider configured for job search');
  }
}

module.exports = new AIProvider();
