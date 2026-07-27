import { describe, expect, it } from 'vitest';
import { buildNiceYAxisRange } from './chartScale';

describe('buildNiceYAxisRange', () => {
  it('keeps a balance chart around its actual values', () => {
    const result = buildNiceYAxisRange([28000, 28125, 28900]);
    expect(result.domain[0]).toBeGreaterThan(0);
    expect(result.domain[0]).toBeLessThanOrEqual(28000);
    expect(result.domain[1]).toBeGreaterThanOrEqual(28900);
    expect(result.ticks).toEqual([...result.ticks].sort((a, b) => a - b));
  });

  it('handles equal, negative and empty values', () => {
    expect(buildNiceYAxisRange([100, 100]).domain).toEqual([98, 102]);
    expect(buildNiceYAxisRange([-10, -5]).domain[1]).toBeGreaterThan(-5);
    expect(buildNiceYAxisRange([])).toEqual({ domain: [0, 0], ticks: [] });
  });
});
