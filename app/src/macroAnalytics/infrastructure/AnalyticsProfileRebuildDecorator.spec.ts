import { describe, expect, it, vi } from 'vitest';
import { withMacroAnalyticsProfileRebuild } from './AnalyticsProfileRebuildDecorator';

describe('withMacroAnalyticsProfileRebuild', () => {
  it('requests a rebuild only after the profile save succeeds', async () => {
    const profile = { get: vi.fn(async () => null), save: vi.fn(async (draft: { userId: string }) => ({ ...draft, completedAt: 'now', updatedAt: 'now', birthYear: 1990, sex: 'female' as const, countryCode: 'GB', regionCode: 'GB-ENG' })) };
    const requestFullRebuild = vi.fn(async () => {});
    const decorated = withMacroAnalyticsProfileRebuild(profile, { requestFullRebuild });
    const draft = { userId: 'u', birthYear: 1990, sex: 'female' as const, countryCode: 'GB', regionCode: 'GB-ENG' };

    await decorated.save(draft);

    expect(requestFullRebuild).toHaveBeenCalledWith('u');
    profile.save.mockRejectedValueOnce(new Error('write failed'));
    await expect(decorated.save(draft)).rejects.toThrow('write failed');
    expect(requestFullRebuild).toHaveBeenCalledTimes(1);
  });
});
