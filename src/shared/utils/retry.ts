export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
}

export interface RetryExhaustedMetadata {
  attempts: number;
  maxAttempts: number;
  baseDelayMs: number;
  lastDelayMs: number;
  delaysMs: number[];
  lastError: unknown;
}

export class RetryExhaustedError extends Error {
  metadata: RetryExhaustedMetadata;

  constructor(message: string, metadata: RetryExhaustedMetadata) {
    super(message);
    this.name = 'RetryExhaustedError';
    this.metadata = metadata;
  }
}

type ErrorRecord = Record<string, unknown>;

function asRecord(value: unknown): ErrorRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as ErrorRecord;
}

function getStatus(error: unknown): number | undefined {
  const root = asRecord(error);
  if (!root) {
    return undefined;
  }

  const status = root.status;
  if (typeof status === 'number') {
    return status;
  }

  const response = asRecord(root.response);
  if (response && typeof response.status === 'number') {
    return response.status;
  }

  return undefined;
}

function getCode(error: unknown): string | undefined {
  const root = asRecord(error);
  if (!root) {
    return undefined;
  }

  if (typeof root.code === 'string' && root.code.trim()) {
    return root.code.trim();
  }

  const nestedError = asRecord(root.error);
  if (nestedError && typeof nestedError.code === 'string' && nestedError.code.trim()) {
    return nestedError.code.trim();
  }

  return undefined;
}

function getCategory(error: unknown): string | undefined {
  const root = asRecord(error);
  if (!root) {
    return undefined;
  }

  if (typeof root.category === 'string' && root.category.trim()) {
    return root.category.trim();
  }

  const nestedError = asRecord(root.error);
  if (nestedError && typeof nestedError.category === 'string' && nestedError.category.trim()) {
    return nestedError.category.trim();
  }

  return undefined;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error).toLowerCase();
}

function getMetadata(error: unknown): ErrorRecord | null {
  const root = asRecord(error);
  if (!root) {
    return null;
  }

  const directMetadata = asRecord(root.metadata);
  if (directMetadata) {
    return directMetadata;
  }

  const nestedError = asRecord(root.error);
  if (!nestedError) {
    return null;
  }

  return asRecord(nestedError.metadata);
}

function parseRetryAfterToMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    if (value > 86_400_000) {
      return value;
    }
    return value * 1000;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const numericValue = Number.parseFloat(value);
  if (!Number.isNaN(numericValue) && numericValue > 0) {
    return numericValue * 1000;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  const diff = timestamp - Date.now();
  return diff > 0 ? diff : undefined;
}

function isRateLimitError(error: unknown): boolean {
  const status = getStatus(error);
  if (status === 429) {
    return true;
  }

  const category = getCategory(error)?.toUpperCase();
  if (category === 'RATE_LIMIT') {
    return true;
  }

  const code = getCode(error)?.toUpperCase();
  return typeof code === 'string' ? code.includes('RATE_LIMIT') : false;
}

function getRetryAfterDelayMs(error: unknown): number | undefined {
  if (!isRateLimitError(error)) {
    return undefined;
  }

  const metadata = getMetadata(error);
  if (metadata) {
    const retryAfterMs = parseRetryAfterToMs(metadata.retryAfterMs);
    if (retryAfterMs) {
      return retryAfterMs;
    }

    const retryAfter = parseRetryAfterToMs(metadata.retryAfter);
    if (retryAfter) {
      return retryAfter;
    }

    const headers = asRecord(metadata.headers);
    if (headers) {
      const fromHeaders = parseRetryAfterToMs(headers['Retry-After'] ?? headers['retry-after']);
      if (fromHeaders) {
        return fromHeaders;
      }
    }
  }

  const root = asRecord(error);
  const response = root ? asRecord(root.response) : null;
  const responseHeaders = response ? asRecord(response.headers) : null;
  if (responseHeaders) {
    const fromObject = parseRetryAfterToMs(responseHeaders['Retry-After'] ?? responseHeaders['retry-after']);
    if (fromObject) {
      return fromObject;
    }
  }

  const headersWithGet = response?.headers as { get?: (name: string) => string | null } | undefined;
  if (headersWithGet?.get) {
    const fromGet = parseRetryAfterToMs(headersWithGet.get('Retry-After'));
    if (fromGet) {
      return fromGet;
    }
  }

  return undefined;
}

function getExponentialDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const multiplier = 2 ** Math.max(0, attempt - 1);
  const delay = baseDelayMs * multiplier * (0.75 + Math.random() * 0.5);
  return Math.min(delay, maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isRetryableError(error: unknown): boolean {
  const status = getStatus(error);
  if (typeof status === 'number' && (status === 408 || status === 429 || status >= 500)) {
    return true;
  }

  const code = getCode(error)?.toUpperCase();
  if (code) {
    if (
      code.includes('TIMEOUT')
      || code.includes('RATE_LIMIT')
      || code.includes('NETWORK')
      || code.includes('UPSTREAM_ERROR')
      || code.includes('PROXY_FAILED')
      || code.includes('OFFLINE')
    ) {
      return true;
    }

    if (
      code.includes('INVALID')
      || code.includes('UNSUPPORTED')
      || code.includes('NOT_FOUND')
      || code.includes('ACCESS_DENIED')
      || code.includes('LOGIN_REQUIRED')
    ) {
      return false;
    }
  }

  const category = getCategory(error)?.toUpperCase();
  if (category === 'NETWORK' || category === 'RATE_LIMIT') {
    return true;
  }

  const message = getMessage(error);
  return (
    message.includes('timeout')
    || message.includes('timed out')
    || message.includes('network')
    || message.includes('failed to fetch')
    || message.includes('econnreset')
    || message.includes('etimedout')
    || message.includes('429')
    || message.includes('rate limit')
  );
}

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(1, options.baseDelayMs ?? 250);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 30_000);
  const retryPredicate = options.isRetryable ?? isRetryableError;

  const delaysMs: number[] = [];
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (!retryPredicate(error)) {
        throw error;
      }

      if (attempt === maxAttempts) {
        throw new RetryExhaustedError('Retry attempts exhausted', {
          attempts: attempt,
          maxAttempts,
          baseDelayMs,
          lastDelayMs: delaysMs.length > 0 ? delaysMs[delaysMs.length - 1] : 0,
          delaysMs,
          lastError,
        });
      }

      const retryAfterMs = getRetryAfterDelayMs(error);
      const delayMs = retryAfterMs ?? getExponentialDelayMs(attempt, baseDelayMs, maxDelayMs);
      delaysMs.push(delayMs);
      await sleep(delayMs);
    }
  }

  throw new RetryExhaustedError('Retry attempts exhausted', {
    attempts: maxAttempts,
    maxAttempts,
    baseDelayMs,
    lastDelayMs: delaysMs.length > 0 ? delaysMs[delaysMs.length - 1] : 0,
    delaysMs,
    lastError,
  });
}
