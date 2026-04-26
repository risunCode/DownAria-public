/**
 * Exponential backoff with ±20% jitter.
 * @param attempt - zero-based attempt number
 * @param maxMs - cap in milliseconds (default 15000)
 */
export function backoffWithJitter(attempt: number, maxMs = 15_000): number {
  const base = Math.min(1000 * Math.pow(2, attempt), maxMs);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(500, base + jitter);
}
