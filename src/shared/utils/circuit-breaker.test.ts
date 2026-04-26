import { describe, expect, it } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('executes successfully in CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, timeout: 30000, halfOpenRequests: 2 });
    const result = await cb.execute('key', async () => 'ok');
    expect(result).toBe('ok');
    expect(cb.getState('key')).toBe('CLOSED');
  });

  it('opens after reaching failureThreshold failures', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, timeout: 30000, halfOpenRequests: 2 });
    const fail = async () => { throw new Error('fail'); };

    for (let i = 0; i < 3; i++) {
      await cb.execute('k', fail).catch(() => {});
    }

    expect(cb.getState('k')).toBe('OPEN');
    await expect(cb.execute('k', async () => 'x')).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('decrements failure count on success so near-threshold failures still trip the circuit sooner', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, timeout: 30000, halfOpenRequests: 2 });
    const fail = async () => { throw new Error('fail'); };

    await cb.execute('k', fail).catch(() => {});
    await cb.execute('k', fail).catch(() => {});

    expect(cb.getState('k')).toBe('CLOSED');

    await cb.execute('k', async () => 'ok');

    await cb.execute('k', fail).catch(() => {});
    await cb.execute('k', fail).catch(() => {});

    expect(cb.getState('k')).toBe('OPEN');
  });
});
