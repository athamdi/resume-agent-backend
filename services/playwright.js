const { chromium } = require('playwright');
const aiProvider = require('./ai-provider');
const fs = require('fs');
const path = require('path');

class PlaywrightService {
  
  constructor() {
    this.browser = null;
  }

  // Initialize browser
  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  // Detect which ATS platform is being used
  async detectPlatform(page) {
    try {
      const url = page.url();
      const html = await page.content();

      if (url.includes('greenhouse.io') || html.includes('greenhouse')) {
        return 'greenhouse';
      }
      if (url.includes('lever.co') || html.includes('lever-frame')) {
        return 'lever';
      }
      if (url.includes('myworkdayjobs.com')) {
        return 'workday';
      }
      if (url.includes('linkedin.com/jobs')) {
        return 'linkedin';
      }
      return 'generic';
    } catch (error) {
      console.error('Platform detection error:', error);
      return 'generic';
    }
  }

  // Main application function
  async applyToJob(applicationData) {
    const { jobUrl, cvData, jobDetails, resumePdfPath } = applicationData;
    
    try {
      await this.init();
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Navigate to application page
      console.log(`Navigating to: ${jobUrl}`);
      await page.goto(jobUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Detect platform
      const platform = await this.detectPlatform(page);
      console.log(`Detected platform: ${platform}`);

      // Handle based on platform
      let result;
      switch(platform) {
        case 'greenhouse':
          result = await this.handleGreenhouse(page, cvData, resumePdfPath);
          break;
        case 'lever':
          result = await this.handleLever(page, cvData, resumePdfPath);
          break;
        case 'workday':
          result = await this.handleWorkday(page, cvData, resumePdfPath);
          break;
        case 'linkedin':
          result = { success: false, error: 'LinkedIn Easy Apply requires manual authentication' };
          break;
        default:
          result = await this.handleGenericForm(page, cvData, jobDetails, resumePdfPath);
      }

      // Take screenshot
      const screenshotPath = `screenshots/application_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      await context.close();

      return {
        ...result,
        screenshotPath,
        platform,
        confirmationUrl: result.confirmationUrl || page.url()
      };

    } catch (error) {
      console.error('Application error:', error);
      return {
        success: false,
        error: error.message,
        screenshotPath: null
      };
    }
  }

  // Handle Greenhouse applications
  async handleGreenhouse(page, cvData, resumePath) {
    try {
      const nameParts = cvData.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Fill basic info
      await page.fill('#first_name', firstName);
      await page.fill('#last_name', lastName);
      await page.fill('#email', cvData.email);
      await page.fill('#phone', cvData.phone || '');

      // Upload resume
      const resumeInput = await page.$('input[type="file"]');
      if (resumeInput) {
        await resumeInput.setInputFiles(resumePath);
        await page.waitForTimeout(2000);
      }

      // Handle custom questions
      const textareas = await page.$$('textarea');
      for (const textarea of textareas) {
        const label = await this.getFieldLabel(page, textarea);
        if (label) {
          const answer = await this.generateAnswerForQuestion(label, cvData);
          await textarea.fill(answer);
        }
      }

      return {
        success: true,
        message: 'Greenhouse form filled successfully',
        confirmationUrl: page.url()
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Handle Lever applications
  async handleLever(page, cvData, resumePath) {
    try {
      await page.fill('input[name="name"]', cvData.fullName);
      await page.fill('input[name="email"]', cvData.email);
      await page.fill('input[name="phone"]', cvData.phone || '');

      const resumeInput = await page.$('input[type="file"][name="resume"]');
      if (resumeInput) {
        await resumeInput.setInputFiles(resumePath);
        await page.waitForTimeout(2000);
      }

      return {
        success: true,
        message: 'Lever form filled successfully',
        confirmationUrl: page.url()
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Handle Workday (more complex)
  async handleWorkday(page, cvData, resumePath) {
    try {
      // Workday usually requires clicking through multiple steps
      await page.click('button:has-text("Apply")');
      await page.waitForTimeout(2000);

      const nameParts = cvData.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Fill basic info on first page
      const firstNameInput = await page.$('input[data-automation-id*="firstName"]');
      if (firstNameInput) await firstNameInput.fill(firstName);
      
      const lastNameInput = await page.$('input[data-automation-id*="lastName"]');
      if (lastNameInput) await lastNameInput.fill(lastName);
      
      return {
        success: true,
        message: 'Workday application started (requires manual completion)',
        confirmationUrl: page.url()
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Handle generic/custom application forms
  async handleGenericForm(page, cvData, jobDetails, resumePath) {
    try {
      // Get form HTML
      const formHtml = await page.content();
      
      // Use AI to analyze the form
      const formFields = await aiProvider.analyzeFormStructure(formHtml);
      
      let fieldsProcessed = 0;

      // Fill each field
      for (const field of formFields) {
        try {
          const element = await page.$(field.fieldName);
          if (!element) continue;

          switch(field.purpose) {
            case 'firstName':
              await element.fill(cvData.fullName.split(' ')[0]);
              fieldsProcessed++;
              break;
            case 'lastName':
              await element.fill(cvData.fullName.split(' ').slice(1).join(' '));
              fieldsProcessed++;
              break;
            case 'email':
              await element.fill(cvData.email);
              fieldsProcessed++;
              break;
            case 'phone':
              await element.fill(cvData.phone || '');
              fieldsProcessed++;
              break;
            case 'resume':
              if (field.type === 'file') {
                await element.setInputFiles(resumePath);
                fieldsProcessed++;
              }
              break;
            case 'coverLetter':
              const coverLetter = await aiProvider.generateCoverLetter(cvData, jobDetails);
              await element.fill(coverLetter);
              fieldsProcessed++;
              break;
            case 'customQuestion':
              const answer = await this.generateAnswerForQuestion(field.label, cvData);
              await element.fill(answer);
              fieldsProcessed++;
              break;
          }
        } catch (fieldError) {
          console.warn(`Could not fill field ${field.fieldName}:`, fieldError.message);
        }
      }

      return {
        success: true,
        message: 'Generic form filled successfully',
        confirmationUrl: page.url(),
        fieldsProcessed
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper: Get label for a form field
  async getFieldLabel(page, element) {
    try {
      const id = await element.getAttribute('id');
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        if (label) {
          return await label.textContent();
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // Helper: Generate answer for a custom question
  async generateAnswerForQuestion(question, cvData) {
    try {
      const answers = await aiProvider.generateApplicationAnswers(
        cvData,
        '',
        [{ question, type: 'textarea' }]
      );
      return answers[0]?.answer || '';
    } catch (error) {
      console.error('Error generating answer:', error);
      return '';
    }
  }

  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new PlaywrightService();
