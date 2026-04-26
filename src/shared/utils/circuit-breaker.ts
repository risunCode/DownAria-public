type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  halfOpenRequests: number;
}

interface BreakerEntry {
  state: State;
  failures: number;
  openedAt: number;
  halfOpenSuccesses: number;
  halfOpenAttempts: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  timeout: 30_000,
  halfOpenRequests: 3,
};

export class CircuitBreakerOpenError extends Error {
  constructor(key: string) {
    super(`Circuit breaker is OPEN for: ${key}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private readonly breakers = new Map<string, BreakerEntry>();
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getEntry(key: string): BreakerEntry {
    let entry = this.breakers.get(key);
    if (!entry) {
      entry = { state: 'CLOSED', failures: 0, openedAt: 0, halfOpenSuccesses: 0, halfOpenAttempts: 0 };
      this.breakers.set(key, entry);
    }
    return entry;
  }

  private transition(entry: BreakerEntry, now: number): void {
    if (entry.state === 'OPEN' && now - entry.openedAt >= this.config.timeout) {
      entry.state = 'HALF_OPEN';
      entry.halfOpenAttempts = 0;
      entry.halfOpenSuccesses = 0;
    }
  }

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const entry = this.getEntry(key);
    const now = Date.now();

    this.transition(entry, now);

    if (entry.state === 'OPEN') {
      throw new CircuitBreakerOpenError(key);
    }

    if (entry.state === 'HALF_OPEN' && entry.halfOpenAttempts >= this.config.halfOpenRequests) {
      throw new CircuitBreakerOpenError(key);
    }

    if (entry.state === 'HALF_OPEN') {
      entry.halfOpenAttempts++;
    }

    try {
      const result = await fn();

      if (entry.state === 'HALF_OPEN') {
        entry.halfOpenSuccesses++;
        if (entry.halfOpenSuccesses >= this.config.halfOpenRequests) {
          entry.state = 'CLOSED';
          entry.failures = 0;
        }
      } else {
        entry.failures = Math.max(0, entry.failures - 1);
      }

      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw error;
      }

      if (entry.state === 'HALF_OPEN') {
        entry.state = 'OPEN';
        entry.openedAt = Date.now();
      } else {
        entry.failures++;
        if (entry.failures >= this.config.failureThreshold) {
          entry.state = 'OPEN';
          entry.openedAt = Date.now();
        }
      }

      throw error;
    }
  }

  getState(key: string): State {
    const entry = this.breakers.get(key);
    if (!entry) return 'CLOSED';
    this.transition(entry, Date.now());
    return entry.state;
  }
}

export const circuitBreaker = new CircuitBreaker();
