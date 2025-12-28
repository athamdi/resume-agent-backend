/**
 * useAuth Hook
 * Custom React hook for authentication state management
 * 
 * USAGE IN LOVABLE:
 * 1. Create this file at: src/hooks/useAuth.ts
 * 2. Import in components: import { useAuth } from '@/hooks/useAuth'
 * 3. Use in component: const { user, login, logout, isAuthenticated } = useAuth()
 */

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Custom hook for authentication
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });
  
  /**
   * Check if user is authenticated on mount
   */
  useEffect(() => {
    checkAuth();
  }, []);
  
  /**
   * Verify current authentication status
   */
  async function checkAuth() {
    if (!api.isAuthenticated()) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    try {
      const response: any = await api.getCurrentUser();
      if (response.success && response.user) {
        setState({
          user: response.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        });
      } else {
        // Invalid token, clear it
        api.logout();
        setState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        });
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
      api.logout();
      setState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      });
    }
  }
  
  /**
   * Login user
   */
  async function login(email: string, password: string) {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response: any = await api.login(email, password);
      
      if (response.success) {
        setState({
          user: response.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        });
        return response;
      } else {
        throw new ApiError(response.error || 'Login failed');
      }
    } catch (err: any) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Login failed. Please try again.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      throw err;
    }
  }
  
  /**
   * Register new user
   */
  async function register(email: string, fullName: string, password: string) {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response: any = await api.register(email, fullName, password);
      
      if (response.success) {
        setState({
          user: response.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        });
        return response;
      } else {
        throw new ApiError(response.error || 'Registration failed');
      }
    } catch (err: any) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Registration failed. Please try again.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      throw err;
    }
  }
  
  /**
   * Logout user
   */
  function logout() {
    api.logout();
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    });
  }
  
  /**
   * Clear error
   */
  function clearError() {
    setState(prev => ({ ...prev, error: null }));
  }
  
  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    clearError,
    checkAuth,
  };
}
