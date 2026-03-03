/**
 * API Client for Backend Communication
 * Handles all requests to the backend API
 *
 * Features:
 * - Configurable request timeout (Issue #3)
 * - Exponential backoff retry for 5xx errors (Issue #12)
 * - Fast offline detection
 */

import { API_URL } from '@/lib/config';
import { ErrorCodes, extractErrorCode, getErrorMessage } from '@/lib/errors/codes';

// Default configuration
const DEFAULT_TIMEOUT = 15000; // 15 seconds for scraping operations
const DEFAULT_RETRIES = 1; // Max 1 retry only for network/5xx errors
const CONNECTION_TIMEOUT = 5000; // 5 seconds for connection check

// NO MORE OFFLINE CACHING - always try fresh connection

export class ApiError extends Error {
    public code?: string;

    constructor(public status: number, message: string, public data?: unknown) {
        super(message);
        this.name = 'ApiError';
        // Extract error code from data if available
        this.code = extractErrorCode(data);
    }
}

function normalizeApiErrorMessage(data: unknown, fallback = 'Request failed'): string {
    if (!data || typeof data !== 'object') {
        return fallback;
    }

    const payload = data as {
        error?: unknown;
        message?: unknown;
    };

    if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
    }

    if (payload.error && typeof payload.error === 'object') {
        const errorObj = payload.error as {
            message?: unknown;
            code?: unknown;
        };

        if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
            return errorObj.message.trim();
        }

        if (typeof errorObj.code === 'string' && errorObj.code.trim()) {
            return errorObj.code.trim();
        }
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim();
    }

    return fallback;
}

export class TimeoutError extends Error {
    public code: string;

    constructor(message = 'Request timed out') {
        super(message);
        this.name = 'TimeoutError';
        this.code = ErrorCodes.TIMEOUT;
    }
}

export class OfflineError extends Error {
    public code: string;

    constructor(message = 'You are offline. Please check your internet connection.') {
        super(message);
        this.name = 'OfflineError';
        this.code = ErrorCodes.OFFLINE;
    }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    /** Request timeout in milliseconds (default: 15000) */
    timeout?: number;
    /** Number of retry attempts for network/5xx errors (default: 1) */
    retries?: number;
}

/**
 * Fetch with timeout support using AbortController
 * @param url - Request URL
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds
 */
async function fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeout = DEFAULT_TIMEOUT
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { 
            ...options, 
            signal: controller.signal 
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new TimeoutError(`Request timed out after ${timeout}ms`);
        }
        // Log the actual error for debugging
        console.error('[API Client] Fetch error:', error);
        // Re-throw original error - don't mask it as offline
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch with retry for network errors and 5xx only
 * 4xx errors are thrown immediately without retry
 * @param url - Request URL
 * @param options - Fetch options
 * @param retries - Number of retry attempts (max 1)
 * @param timeout - Timeout per request in milliseconds
 */
async function fetchWithRetry(
    url: string, 
    options: RequestInit, 
    retries = DEFAULT_RETRIES,
    timeout = DEFAULT_TIMEOUT
): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeout);
            
            // 4xx errors: throw immediately without retry
            if (response.status >= 400 && response.status < 500) {
                return response;
            }
            
            // Success or 4xx (will be handled by caller)
            if (response.ok || response.status < 500) {
                return response;
            }
            
            // 5xx error: store for potential retry
            lastError = new Error(`Server error: ${response.status}`);
        } catch (error) {
            // Don't retry if backend is offline
            if (error instanceof OfflineError) {
                throw error;
            }
            
            // Don't retry if it was a timeout
            if (error instanceof TimeoutError) {
                throw error;
            }
            
            // Network error: store for retry
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // No more retries left
            if (attempt === retries) {
                throw lastError;
            }
        }
        
        // Only retry once for 5xx/network errors, no backoff delay
        if (attempt < retries && lastError) {
            continue;
        }
    }
    
    throw lastError || new Error('Request failed');
}

export async function apiClient<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new OfflineError(getErrorMessage(ErrorCodes.OFFLINE));
    }

    const {
        body,
        timeout = DEFAULT_TIMEOUT,
        retries = DEFAULT_RETRIES,
        ...fetchOptions
    } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    const url = endpoint.startsWith('http')
        ? endpoint
        : endpoint.startsWith('/api/web/')
            ? endpoint
            : `${API_URL}${endpoint}`;

    const response = await fetchWithRetry(
        url,
        {
            ...fetchOptions,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        },
        retries,
        timeout
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        // Try to extract error code from response and get user-friendly message
        const errorCode = extractErrorCode(data);
        const fallback = errorCode
            ? getErrorMessage(errorCode, response.statusText?.trim() || 'Request failed')
            : (response.statusText?.trim() ? response.statusText : 'Request failed');
        throw new ApiError(response.status, normalizeApiErrorMessage(data, fallback), data);
    }

    return data as T;
}

// Convenience methods
export const api = {
    get: <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'body'>) =>
        apiClient<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
        apiClient<T>(endpoint, { ...options, method: 'POST', body }),
    
    put: <T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
        apiClient<T>(endpoint, { ...options, method: 'PUT', body }),
    
    patch: <T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
        apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),
    
    delete: <T>(endpoint: string, options?: Omit<FetchOptions, 'method'>) =>
        apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
