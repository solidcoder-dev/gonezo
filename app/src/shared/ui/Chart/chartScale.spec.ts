import { describe, expect, it } from 'vitest';
import { buildUniformYAxisTicks, formatExactAxisValue } from './chartScale';

describe('chartScale', () => {
  it('builds evenly spaced y-axis ticks up to the visible maximum', () => {
    expect(buildUniformYAxisTicks(1200)).toEqual([0, 300, 600, 900, 1200]);
  });

  it('rounds the top tick up with a uniform step when the maximum is not exact', () => {
    expect(buildUniformYAxisTicks(1250)).toEqual([0, 400, 800, 1200, 1600]);
  });

  it('formats axis labels without hiding exact scale differences', () => {
    expect(formatExactAxisValue(1200)).toBe('1.2k');
    expect(formatExactAxisValue(1000)).toBe('1k');
    expect(formatExactAxisValue(300)).toBe('300');
  });
});
