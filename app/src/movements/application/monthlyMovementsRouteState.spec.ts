import { describe, expect, it } from 'vitest';
import {
  decodeMonthlyMovementsRouteState,
  monthlyMovementsRouteStateNeedsNormalization,
  serializeMonthlyMovementsRouteState,
} from './monthlyMovementsRouteState';

const clock = { now: () => new Date(2026, 8, 11) };

describe('monthly movements route state', () => {
  it('decodes valid parameters', () => {
    expect(decodeMonthlyMovementsRouteState('?month=2023-07&mode=planned', clock)).toEqual({ month: '2023-07', mode: 'planned' });
  });

  it('uses current month and Posted when parameters are absent', () => {
    expect(decodeMonthlyMovementsRouteState('', clock)).toEqual({ month: '2026-09', mode: 'posted' });
  });

  it('rejects invalid months', () => {
    expect(decodeMonthlyMovementsRouteState('?month=2023-00&mode=posted', clock).month).toBe('2026-09');
    expect(decodeMonthlyMovementsRouteState('?month=2023-13&mode=posted', clock).month).toBe('2026-09');
    expect(decodeMonthlyMovementsRouteState('?month=2023-7&mode=posted', clock).month).toBe('2026-09');
  });

  it('rejects invalid modes', () => {
    expect(decodeMonthlyMovementsRouteState('?month=2023-07&mode=archived', clock).mode).toBe('posted');
  });

  it('accepts December and January', () => {
    expect(decodeMonthlyMovementsRouteState('?month=2023-12&mode=posted', clock).month).toBe('2023-12');
    expect(decodeMonthlyMovementsRouteState('?month=2024-01&mode=posted', clock).month).toBe('2024-01');
  });

  it('preserves unrelated parameters while serializing', () => {
    const serialized = serializeMonthlyMovementsRouteState('?account=all&month=2023-06&mode=posted', { month: '2023-07', mode: 'planned' });
    expect(new URLSearchParams(serialized).get('account')).toBe('all');
    expect(new URLSearchParams(serialized).get('month')).toBe('2023-07');
    expect(new URLSearchParams(serialized).get('mode')).toBe('planned');
  });

  it('detects when the canonical state differs from the current query', () => {
    expect(monthlyMovementsRouteStateNeedsNormalization('', { month: '2026-09', mode: 'posted' })).toBe(true);
    expect(monthlyMovementsRouteStateNeedsNormalization('?month=2026-09&mode=posted', { month: '2026-09', mode: 'posted' })).toBe(false);
  });
});
