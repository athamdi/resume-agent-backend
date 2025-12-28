/**
 * API Service Layer
 * Handles all HTTP requests to the backend
 * Includes error handling, token management, and request/response formatting
 * 
 * USAGE IN LOVABLE:
 * 1. Create this file at: src/services/api.ts
 * 2. Import in components: import { api } from '@/services/api'
 * 3. Use methods: await api.login(email, password)
 */

import { API_URL, API_ENDPOINTS, REQUEST_TIMEOUT, STORAGE_KEYS } from '@/config/api';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Service Class
 * Singleton pattern for managing all API calls
 */
class ApiService {
  
  /**
   * Get authentication token from localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }
  
  /**
   * Generic request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(
          data.error || data.message || 'Request failed',
          response.status,
          data.code
        );
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error.message || 'Network error',
        0
      );
    }
  }
  
  // ========================================
  // Authentication Methods
  // ========================================
  
  /**
   * Register a new user
   */
  async register(email: string, fullName: string, password: string) {
    const response: any = await this.request(API_ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, fullName, password }),
    });
    
    if (response.success && response.token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      localStorage.setItem(STORAGE_KEYS.USER_ID, response.user.id);
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, response.user.email);
    }
    
    return response;
  }
  
  /**
   * Login user
   */
  async login(email: string, password: string) {
    const response: any = await this.request(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      localStorage.setItem(STORAGE_KEYS.USER_ID, response.user.id);
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, response.user.email);
    }
    
    return response;
  }
  
  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    return this.request(API_ENDPOINTS.AUTH_ME);
  }
  
  /**
   * Logout user (clear local storage)
   */
  logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  
  // ========================================
  // CV Methods
  // ========================================
  
  /**
   * Upload CV for analysis and storage
   */
  async uploadCV(cvText: string) {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return this.request(API_ENDPOINTS.CV_UPLOAD, {
      method: 'POST',
      body: JSON.stringify({ userId, cvText }),
    });
  }
  
  /**
   * Analyze CV without saving
   */
  async analyzeCV(cvText: string) {
    return this.request(API_ENDPOINTS.CV_ANALYZE, {
      method: 'POST',
      body: JSON.stringify({ cvText }),
    });
  }
  
  /**
   * Get user's CV
   */
  async getUserCV() {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return this.request(`${API_ENDPOINTS.CV_GET}/${userId}`);
  }
  
  // ========================================
  // Job Methods
  // ========================================
  
  /**
   * Search for jobs
   */
  async searchJobs(companies: string[], keywords: string[]) {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return this.request(API_ENDPOINTS.JOBS_SEARCH, {
      method: 'POST',
      body: JSON.stringify({ userId, companies, keywords }),
    });
  }
  
  /**
   * Get matched jobs for user
   */
  async getJobMatches() {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return this.request(`${API_ENDPOINTS.JOBS_MATCHES}/${userId}`);
  }
  
  /**
   * Add job manually
   */
  async addJob(jobData: {
    company: string;
    title: string;
    location: string;
    url: string;
    description?: string;
  }) {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return this.request(API_ENDPOINTS.JOBS_ADD, {
      method: 'POST',
      body: JSON.stringify({ ...jobData, userId }),
    });
  }
  
  // ========================================
  // Application Methods
  // ========================================
  
  /**
   * Apply to a single job
   */
  async applyToJob(jobId: string) {
    return this.request(`${API_ENDPOINTS.APPLY_SINGLE}/${jobId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
  
  /**
   * Apply to multiple jobs (bulk)
   */
  async bulkApply(jobIds: string[]) {
    return this.request(API_ENDPOINTS.APPLY_BULK, {
      method: 'POST',
      body: JSON.stringify({ jobIds }),
    });
  }
  
  /**
   * Get application status
   */
  async getApplicationStatus(applicationId: string) {
    return this.request(`${API_ENDPOINTS.APPLY_STATUS}/${applicationId}`);
  }
  
  /**
   * Get all user applications
   */
  async getUserApplications() {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return this.request(`${API_ENDPOINTS.APPLY_USER}/${userId}`);
  }
  
  // ========================================
  // Analytics Methods
  // ========================================
  
  /**
   * Get user statistics
   */
  async getStats() {
    return this.request(API_ENDPOINTS.ANALYTICS_STATS);
  }
  
  /**
   * Get application timeline
   */
  async getTimeline(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`${API_ENDPOINTS.ANALYTICS_TIMELINE}${query}`);
  }
  
  /**
   * Get quick summary
   */
  async getSummary() {
    return this.request(API_ENDPOINTS.ANALYTICS_SUMMARY);
  }
  
  // ========================================
  // System Methods
  // ========================================
  
  /**
   * Health check
   */
  async healthCheck() {
    return this.request(API_ENDPOINTS.HEALTH);
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
  
  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.USER_ID);
  }
}

// Export singleton instance
export const api = new ApiService();
