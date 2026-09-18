import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_CONTRIBUTION_NOTICE_VERSION,
  canContribute,
  createAnalyticsContributionConsent,
  declineAnalyticsContribution,
  grantAnalyticsContribution,
  withdrawAnalyticsContribution,
} from './analyticsContributionConsent';

describe('AnalyticsContributionConsent', () => {
  it('records the explicit decision, notice version, and decision time', () => {
    const granted = grantAnalyticsContribution('user-A', '2026-09-18T10:00:00.000Z');
    const declined = declineAnalyticsContribution('user-A', '2026-09-18T10:00:00.000Z');

    expect(granted).toEqual({
      userId: 'user-A',
      status: 'GRANTED',
      noticeVersion: ANALYTICS_CONTRIBUTION_NOTICE_VERSION,
      decidedAt: '2026-09-18T10:00:00.000Z',
    });
    expect(canContribute(granted)).toBe(true);
    expect(canContribute(declined)).toBe(false);
  });

  it('allows withdrawal and explicit re-grant after any non-granted decision', () => {
    const initial = createAnalyticsContributionConsent({
      userId: 'user-A',
      status: 'GRANTED',
      noticeVersion: ANALYTICS_CONTRIBUTION_NOTICE_VERSION,
      decidedAt: '2026-09-18T10:00:00.000Z',
    });
    const withdrawn = withdrawAnalyticsContribution(initial, '2026-09-19T10:00:00.000Z');
    const reGranted = grantAnalyticsContribution('user-A', '2026-09-20T10:00:00.000Z');

    expect(withdrawn.status).toBe('WITHDRAWN');
    expect(canContribute(withdrawn)).toBe(false);
    expect(reGranted.status).toBe('GRANTED');
    expect(canContribute(reGranted)).toBe(true);
  });
});
