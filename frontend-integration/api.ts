/**
 * API Configuration
 * Define base URL and all API endpoints for the frontend
 * 
 * USAGE IN LOVABLE:
 * 1. Create this file at: src/config/api.ts
 * 2. Import in your components: import { API_URL, API_ENDPOINTS } from '@/config/api'
 */

// API Base URL - automatically uses localhost in development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * All API Endpoints
 * Organized by feature area
 */
export const API_ENDPOINTS = {
  // ========================================
  // Authentication Endpoints
  // ========================================
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_ME: '/api/auth/me',
  AUTH_LOGOUT: '/api/auth/logout',
  
  // ========================================
  // CV Management Endpoints
  // ========================================
  CV_UPLOAD: '/api/cv/upload',
  CV_ANALYZE: '/api/cv/analyze',
  CV_GET: '/api/cv',
  CV_UPDATE: '/api/cv/update',
  
  // ========================================
  // Job Search Endpoints
  // ========================================
  JOBS_SEARCH: '/api/jobs/search',
  JOBS_MATCHES: '/api/jobs/matches',
  JOBS_ADD: '/api/jobs/add',
  JOBS_GET: '/api/jobs',
  JOBS_DELETE: '/api/jobs',
  
  // ========================================
  // Application Endpoints
  // ========================================
  APPLY_SINGLE: '/api/apply',
  APPLY_BULK: '/api/apply/bulk',
  APPLY_STATUS: '/api/apply/status',
  APPLY_USER: '/api/apply/user',
  APPLY_CANCEL: '/api/apply/cancel',
  
  // ========================================
  // Analytics Endpoints
  // ========================================
  ANALYTICS_STATS: '/api/analytics/stats',
  ANALYTICS_TIMELINE: '/api/analytics/timeline',
  ANALYTICS_SUMMARY: '/api/analytics/summary',
  
  // ========================================
  // System Endpoints
  // ========================================
  HEALTH: '/api/health',
  TEST_DB: '/api/test-db',
  TEST_GEMINI: '/api/test-gemini',
};

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  THEME: 'theme',
};

/**
 * Application limits
 */
export const LIMITS = {
  DAILY_APPLICATIONS: 20,
  MAX_CV_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BULK_APPLY: 10,
};
