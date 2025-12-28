/**
 * useApplications Hook
 * Custom React hook for managing job applications
 * 
 * USAGE IN LOVABLE:
 * 1. Create this file at: src/hooks/useApplications.ts
 * 2. Import: import { useApplications } from '@/hooks/useApplications'
 * 3. Use: const { applications, stats, applyToJob, loading } = useApplications()
 */

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/services/api';

interface Application {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued';
  createdAt: string;
  applicationDate?: string;
  screenshotPath?: string;
  errorMessage?: string;
  job?: {
    id: string;
    company: string;
    title: string;
    location: string;
    url: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  todayCount: number;
  remainingToday: number;
  successRate: number;
}

/**
 * Custom hook for job applications
 */
export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Load applications on mount
   */
  useEffect(() => {
    loadApplications();
    loadStats();
  }, []);
  
  /**
   * Load user applications
   */
  async function loadApplications() {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.getUserApplications();
      
      if (response.success) {
        setApplications(response.applications || []);
      }
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Load statistics
   */
  async function loadStats() {
    try {
      const response: any = await api.getStats();
      
      if (response.success) {
        setStats(response.stats);
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }
  
  /**
   * Apply to a single job
   */
  async function applyToJob(jobId: string) {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.applyToJob(jobId);
      
      if (response.success) {
        // Refresh applications and stats
        await Promise.all([loadApplications(), loadStats()]);
        return response;
      } else {
        throw new ApiError(response.error || 'Application failed');
      }
    } catch (err: any) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to submit application';
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Apply to multiple jobs (bulk)
   */
  async function bulkApply(jobIds: string[]) {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.bulkApply(jobIds);
      
      if (response.success) {
        // Refresh applications and stats
        await Promise.all([loadApplications(), loadStats()]);
        return response;
      } else {
        throw new ApiError(response.error || 'Bulk application failed');
      }
    } catch (err: any) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to submit applications';
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Get application by ID
   */
  function getApplication(id: string): Application | undefined {
    return applications.find(app => app.id === id);
  }
  
  /**
   * Refresh data
   */
  async function refresh() {
    await Promise.all([loadApplications(), loadStats()]);
  }
  
  return {
    applications,
    stats,
    loading,
    error,
    applyToJob,
    bulkApply,
    getApplication,
    refresh,
  };
}
