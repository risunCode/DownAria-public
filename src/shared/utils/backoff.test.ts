import { describe, it, expect } from 'vitest';
import { backoffWithJitter } from './backoff';

describe('backoffWithJitter', () => {
  it('returns at least 500ms', () => {
    for (let i = 0; i < 20; i++) {
      expect(backoffWithJitter(0)).toBeGreaterThanOrEqual(500);
    }
  });
  it('stays within ±20% of base', () => {
    const base = Math.min(1000 * Math.pow(2, 3), 15000); // attempt=3
    for (let i = 0; i < 50; i++) {
      const result = backoffWithJitter(3);
      expect(result).toBeGreaterThanOrEqual(base * 0.8 - 1);
      expect(result).toBeLessThanOrEqual(base * 1.2 + 1);
    }
  });
  it('caps at maxMs with jitter', () => {
    for (let i = 0; i < 20; i++) {
      expect(backoffWithJitter(20)).toBeLessThanOrEqual(15000 * 1.2 + 1);
    }
  });
});
