import { describe, expect, it } from 'vitest';
import { ExactDecimal, addExactDecimals, subtractExactDecimals } from './exactDecimal';

describe('ExactDecimal', () => {
  it('adds and subtracts deterministically while retaining operation scale', () => {
    expect(addExactDecimals('0.10', '0.20')).toBe('0.30');
    expect(addExactDecimals('1000.01', '0.09')).toBe('1000.10');
    expect(subtractExactDecimals('1000.10', '1000.01')).toBe('0.09');
  });

  it('serializes canonically, compares exactly and rounds ratios half away from zero', () => {
    expect(ExactDecimal.from('001.2300').toString()).toBe('1.23');
    expect(ExactDecimal.from('0.30').compare(ExactDecimal.from('0.3'))).toBe(0);
    expect(ExactDecimal.from('1').ratioTo(ExactDecimal.from('8'), 2).toFixed(2)).toBe('0.13');
    expect(ExactDecimal.from('-1').ratioTo(ExactDecimal.from('8'), 2).toFixed(2)).toBe('-0.13');
  });
});
