import { describe, expect, it } from 'vitest';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

describe('mapAnalyticsMovementSource', () => {
  it.each([
    ['POSTED', 'POSTED'],
    ['EXPECTED', 'EXPECTED'],
    ['SCHEDULED_PROJECTION', 'SCHEDULED'],
  ] as const)('maps %s to %s', (source, expected) => {
    expect(mapAnalyticsMovementSource(source)).toBe(expected);
  });
});
