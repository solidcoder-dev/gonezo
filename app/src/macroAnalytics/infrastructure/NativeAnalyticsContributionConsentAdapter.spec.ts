import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { NativeAnalyticsContributionConsentAdapter } from './NativeAnalyticsContributionConsentAdapter';

const { stored, nativeGet, nativeSave } = vi.hoisted(() => ({
  stored: new Map<string, AnalyticsContributionConsent>(),
  nativeGet: vi.fn(async ({ userId }: { userId: string }) => ({ consent: stored.get(userId) })),
  nativeSave: vi.fn(async ({ consent }: { consent: AnalyticsContributionConsent }) => { stored.set(consent.userId, consent); }),
}));

vi.mock('./analyticsContributionConsentPlugin', () => ({
  AnalyticsContributionConsentNativePlugin: { get: nativeGet, save: nativeSave },
}));

describe('NativeAnalyticsContributionConsentAdapter', () => {
  beforeEach(() => {
    stored.clear();
    nativeGet.mockClear();
    nativeSave.mockClear();
  });

  it('retains each user decision across adapter reconstruction', async () => {
    const firstAdapter = new NativeAnalyticsContributionConsentAdapter();
    const consent: AnalyticsContributionConsent = {
      userId: 'user-A', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-09-18T10:00:00.000Z',
    };
    await firstAdapter.save(consent);

    const restartedAdapter = new NativeAnalyticsContributionConsentAdapter();
    await expect(restartedAdapter.get('user-A')).resolves.toEqual(consent);
    await expect(restartedAdapter.get('user-B')).resolves.toBeNull();
  });
});
