import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsProfile } from '../../analyticsProfile/domain/analyticsProfile';
import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import { createAnalyticsProfileContributionAdapter } from './analyticsProfileContributionAdapter';

const existingProfile: AnalyticsProfile = {
  userId: 'private-user-id',
  birthYear: 1995,
  sex: 'female',
  countryCode: 'ES',
  regionCode: 'ES-CN',
  completedAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
};

describe('Analytics Profile contribution adapter', () => {
  it('maps only Macro Analytics profile fields and preserves explicit sex vocabulary', async () => {
    const profiles: Pick<AnalyticsProfilePort, 'get'> = { get: vi.fn(async () => existingProfile) };
    const result = await createAnalyticsProfileContributionAdapter(profiles).get('private-user-id');
    expect(result).toEqual({ birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' });
    expect(JSON.stringify(result)).not.toMatch(/userId|completedAt|updatedAt/);
    expect(profiles.get).toHaveBeenCalledWith('private-user-id');
  });

  it('returns no contribution profile when Analytics Profile is unavailable or incomplete', async () => {
    const unavailable: Pick<AnalyticsProfilePort, 'get'> = { get: vi.fn(async () => null) };
    expect(await createAnalyticsProfileContributionAdapter(unavailable).get('user')).toBeNull();
    const incomplete: Pick<AnalyticsProfilePort, 'get'> = { get: vi.fn(async () => ({ ...existingProfile, regionCode: '' })) };
    expect(await createAnalyticsProfileContributionAdapter(incomplete).get('user')).toBeNull();
  });
});
