/**
 * Error Codes - Synced with Backend
 * @see Reborn/FetchMoona/internal/core/errors/codes.go
 * 
 * This file should be kept in sync with the backend error codes.
 * When adding new error codes, add them to both backend and frontend.
 */

export const ErrorCodes = {
    // Backend Generic Errors
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    PLATFORM_NOT_FOUND: 'PLATFORM_NOT_FOUND',
    NETWORK_ERROR: 'NETWORK_ERROR',
    EXTRACTION_FAILED: 'EXTRACTION_FAILED',
    RATE_LIMITED_429: 'RATE_LIMITED_429',

    // Validation Errors
    INVALID_JSON: 'INVALID_JSON',
    INVALID_URL: 'INVALID_URL',
    UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
    INVALID_SOURCE: 'INVALID_SOURCE',
    MISSING_PARAMS: 'MISSING_PARAMS',

    // Content Errors
    NO_MEDIA_FOUND: 'NO_MEDIA_FOUND',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',

    // Upstream Errors
    UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
    UPSTREAM_RATE_LIMITED: 'UPSTREAM_RATE_LIMITED',
    UPSTREAM_FORBIDDEN: 'UPSTREAM_FORBIDDEN',
    UPSTREAM_ERROR: 'UPSTREAM_ERROR',

    // Server Errors
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    ORIGIN_NOT_ALLOWED: 'ORIGIN_NOT_ALLOWED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    MERGE_FAILED: 'MERGE_FAILED',
    FFMPEG_UNAVAILABLE: 'FFMPEG_UNAVAILABLE',
    PROXY_FAILED: 'PROXY_FAILED',

    // Client Errors
    OFFLINE: 'OFFLINE',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export const ErrorCategories = {
    NETWORK: 'NETWORK',
    VALIDATION: 'VALIDATION',
    RATE_LIMIT: 'RATE_LIMIT',
    AUTH: 'AUTH',
    NOT_FOUND: 'NOT_FOUND',
    EXTRACTION_FAILED: 'EXTRACTION_FAILED',
} as const;

export type ErrorCategory = typeof ErrorCategories[keyof typeof ErrorCategories];

export const ERROR_CODE_CATEGORY_MAP: Partial<Record<ErrorCode, ErrorCategory>> = {
    [ErrorCodes.PLATFORM_NOT_FOUND]: ErrorCategories.NOT_FOUND,

    [ErrorCodes.INVALID_JSON]: ErrorCategories.VALIDATION,
    [ErrorCodes.INVALID_URL]: ErrorCategories.VALIDATION,
    [ErrorCodes.UNSUPPORTED_PLATFORM]: ErrorCategories.VALIDATION,
    [ErrorCodes.INVALID_SOURCE]: ErrorCategories.VALIDATION,
    [ErrorCodes.MISSING_PARAMS]: ErrorCategories.VALIDATION,
    [ErrorCodes.METHOD_NOT_ALLOWED]: ErrorCategories.VALIDATION,

    [ErrorCodes.NO_MEDIA_FOUND]: ErrorCategories.EXTRACTION_FAILED,
    [ErrorCodes.FILE_TOO_LARGE]: ErrorCategories.EXTRACTION_FAILED,
    [ErrorCodes.MERGE_FAILED]: ErrorCategories.EXTRACTION_FAILED,
    [ErrorCodes.FFMPEG_UNAVAILABLE]: ErrorCategories.EXTRACTION_FAILED,

    [ErrorCodes.NETWORK_ERROR]: ErrorCategories.NETWORK,
    [ErrorCodes.UPSTREAM_TIMEOUT]: ErrorCategories.NETWORK,
    [ErrorCodes.UPSTREAM_ERROR]: ErrorCategories.NETWORK,
    [ErrorCodes.PROXY_FAILED]: ErrorCategories.NETWORK,
    [ErrorCodes.OFFLINE]: ErrorCategories.NETWORK,
    [ErrorCodes.TIMEOUT]: ErrorCategories.NETWORK,

    [ErrorCodes.RATE_LIMITED_429]: ErrorCategories.RATE_LIMIT,
    [ErrorCodes.UPSTREAM_RATE_LIMITED]: ErrorCategories.RATE_LIMIT,
    [ErrorCodes.RATE_LIMITED]: ErrorCategories.RATE_LIMIT,

    [ErrorCodes.AUTH_REQUIRED]: ErrorCategories.AUTH,
    [ErrorCodes.LOGIN_REQUIRED]: ErrorCategories.AUTH,
    [ErrorCodes.UPSTREAM_FORBIDDEN]: ErrorCategories.AUTH,
    [ErrorCodes.ORIGIN_NOT_ALLOWED]: ErrorCategories.AUTH,
    [ErrorCodes.ACCESS_DENIED]: ErrorCategories.AUTH,

    [ErrorCodes.NOT_FOUND]: ErrorCategories.NOT_FOUND,

    [ErrorCodes.EXTRACTION_FAILED]: ErrorCategories.EXTRACTION_FAILED,
    [ErrorCodes.UNKNOWN]: ErrorCategories.EXTRACTION_FAILED,
};

/**
 * User-friendly error messages mapped to error codes
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
    [ErrorCodes.AUTH_REQUIRED]: 'Authentication required. Please provide credentials and try again.',
    [ErrorCodes.PLATFORM_NOT_FOUND]: 'Platform not found or not supported for this URL.',
    [ErrorCodes.NETWORK_ERROR]: 'Network error occurred. Please check your connection and try again.',
    [ErrorCodes.EXTRACTION_FAILED]: 'Failed to extract media from this URL. Please try again.',
    [ErrorCodes.RATE_LIMITED_429]: 'Too many requests. Please wait a moment and try again.',

    [ErrorCodes.INVALID_JSON]: 'Invalid request format. Please try again.',
    [ErrorCodes.INVALID_URL]: 'Invalid URL. Please provide a valid URL.',
    [ErrorCodes.UNSUPPORTED_PLATFORM]: 'This platform is not supported.',
    [ErrorCodes.INVALID_SOURCE]: 'Invalid source URL.',
    [ErrorCodes.MISSING_PARAMS]: 'Required parameters are missing.',

    [ErrorCodes.NO_MEDIA_FOUND]: 'No downloadable media was detected on this URL. This can happen because the post is private or age-restricted. If you believe this is a mistake, add your cookies in Settings > Cookies.',
    [ErrorCodes.LOGIN_REQUIRED]: 'This content requires authentication. Please provide a cookie in Settings > Cookies to access private, age-restricted, or login-required content.',
    [ErrorCodes.FILE_TOO_LARGE]: 'File exceeds maximum allowed size.',

    [ErrorCodes.UPSTREAM_TIMEOUT]: 'Request timed out. Please try again.',
    [ErrorCodes.UPSTREAM_RATE_LIMITED]: 'Rate limited. Please wait a moment and try again.',
    [ErrorCodes.UPSTREAM_FORBIDDEN]: 'Access denied. This content may be private or restricted.',
    [ErrorCodes.UPSTREAM_ERROR]: 'Service temporarily unavailable. Please try again later.',

    [ErrorCodes.METHOD_NOT_ALLOWED]: 'Request method not allowed.',
    [ErrorCodes.NOT_FOUND]: 'Resource not found.',
    [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please wait a moment.',
    [ErrorCodes.ORIGIN_NOT_ALLOWED]: 'Request origin is not allowed.',
    [ErrorCodes.ACCESS_DENIED]: 'Access denied.',
    [ErrorCodes.MERGE_FAILED]: 'Failed to process media. Please try again.',
    [ErrorCodes.FFMPEG_UNAVAILABLE]: 'Media processing service unavailable. Please try again later.',
    [ErrorCodes.PROXY_FAILED]: 'Proxy connection failed. Please try again.',

    [ErrorCodes.OFFLINE]: 'You are offline. Please check your internet connection.',
    [ErrorCodes.TIMEOUT]: 'Request timed out. Please try again.',
    [ErrorCodes.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly error message for an error code
 * Falls back to a generic message if code is unknown
 */
export function getErrorMessage(code: string | undefined, fallback?: string): string {
    if (!code) return fallback || ERROR_MESSAGES[ErrorCodes.UNKNOWN];
    return ERROR_MESSAGES[code as ErrorCode] || fallback || ERROR_MESSAGES[ErrorCodes.UNKNOWN];
}

/**
 * Check if an error code indicates a retryable error
 */
export function isRetryableError(code: string | undefined): boolean {
    if (!code) return false;
    const retryableCodes: string[] = [
        ErrorCodes.UPSTREAM_TIMEOUT,
        ErrorCodes.UPSTREAM_RATE_LIMITED,
        ErrorCodes.RATE_LIMITED_429,
        ErrorCodes.UPSTREAM_ERROR,
        ErrorCodes.NETWORK_ERROR,
        ErrorCodes.RATE_LIMITED,
        ErrorCodes.PROXY_FAILED,
        ErrorCodes.OFFLINE,
        ErrorCodes.TIMEOUT,
    ];
    return retryableCodes.includes(code);
}

/**
 * Check if an error code indicates authentication is required
 */
export function isAuthError(code: string | undefined): boolean {
    if (!code) return false;
    return (
        code === ErrorCodes.AUTH_REQUIRED ||
        code === ErrorCodes.LOGIN_REQUIRED ||
        code === ErrorCodes.ACCESS_DENIED
    );
}

/**
 * Extract error code from API error response
 */
export function extractErrorCode(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;

    const payload = data as {
        error?: unknown;
        code?: unknown;
    };

    // Check for code in error object
    if (payload.error && typeof payload.error === 'object') {
        const errorObj = payload.error as { code?: unknown };
        if (typeof errorObj.code === 'string' && errorObj.code.trim()) {
            return errorObj.code.trim();
        }
    }

    // Check for code at root level
    if (typeof payload.code === 'string' && payload.code.trim()) {
        return payload.code.trim();
    }

    return undefined;
}

/**
 * Map backend/frontend error code to UI-friendly category
 */
export function getErrorCategory(code: string | undefined): ErrorCategory {
    if (!code) return ErrorCategories.EXTRACTION_FAILED;

    const mapped = ERROR_CODE_CATEGORY_MAP[code as ErrorCode];
    return mapped || ErrorCategories.EXTRACTION_FAILED;
}
