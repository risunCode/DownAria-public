import { describe, it, expect } from 'vitest';
import { isRecord } from './type-guards';

describe('isRecord', () => {
  it('returns true for plain objects', () => expect(isRecord({})).toBe(true));
  it('returns false for arrays', () => expect(isRecord([])).toBe(false));
  it('returns false for null', () => expect(isRecord(null)).toBe(false));
  it('returns false for primitives', () => {
    expect(isRecord(1)).toBe(false);
    expect(isRecord('str')).toBe(false);
  });
});
