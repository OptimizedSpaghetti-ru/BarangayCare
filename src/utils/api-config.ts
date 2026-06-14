/**
 * API Configuration for BarangayCare
 *
 * This utility automatically detects the correct API endpoint:
 * - In production (Vercel): Uses the same domain with /api prefix
 * - In development: Can use environment variable or fallback to /api
 * - Legacy Supabase Functions: Still supported for backward compatibility
 */

import { projectId } from "./supabase/info";

// Check if we're running on Vercel or in production
const isProduction = import.meta.env.PROD;
const customApiUrl = import.meta.env.VITE_API_URL;

/**
 * Get the base API URL for the backend
 * Priority:
 * 1. Custom environment variable (VITE_API_URL)
 * 2. Production/Vercel: Use relative /api path
 * 3. Development: Use relative /api path (assumes dev proxy or deployed backend)
 */
export function getApiBaseUrl(): string {
  if (customApiUrl) {
    return customApiUrl;
  }

  // Use relative path - works both in Vercel and with local dev proxy
  return "/api/make-server-fc40ab2c";
}

/**
 * Get the full API URL for a specific endpoint
 * @param endpoint - The endpoint path (e.g., '/auth/signup')
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Legacy Supabase Functions URL (for backward compatibility)
 * This can be used if you still want to support Supabase Edge Functions
 */
export function getSupabaseFunctionUrl(): string {
  return `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;
}

/**
 * Make an authenticated API request
 * @param endpoint - The endpoint path
 * @param options - Fetch options
 * @param accessToken - The user's access token
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const url = getApiUrl(endpoint);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Merge in any custom headers
  if (options.headers) {
    const customHeaders = options.headers as Record<string, string>;
    Object.assign(headers, customHeaders);
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      error.error || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

// Export commonly used endpoints
export const API_ENDPOINTS = {
  HEALTH: "/health",
  AUTH: {
    SIGNUP: "/auth/signup",
    PROFILE: "/auth/profile",
  },
  ADMIN: {
    USERS: "/admin/users",
    USER_BY_ID: (userId: string) => `/admin/users/${userId}`,
  },
} as const;

// Example usage in components:
// import { apiRequest, API_ENDPOINTS, getApiUrl } from '@/utils/api-config';
//
// // Simple request with helper
// const data = await apiRequest(API_ENDPOINTS.AUTH.PROFILE, {}, accessToken);
//
// // Manual fetch with URL
// fetch(getApiUrl('/auth/signup'), { ... });
