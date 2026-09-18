import { describe, expect, it } from 'vitest';
import { validateAnalyticsProfileDraft, type AnalyticsProfileDraft } from './analyticsProfile';

const validDraft: AnalyticsProfileDraft = {
  userId: 'user-1',
  birthYear: 1995,
  sex: 'female',
  countryCode: 'ES',
  regionCode: 'ES-CN',
};

describe('Analytics Profile validation', () => {
  it('accepts canonical country and matching region codes', () => {
    expect(validateAnalyticsProfileDraft(validDraft, 2026)).toEqual({});
  });

  it('rejects a region that belongs to another country', () => {
    expect(validateAnalyticsProfileDraft({ ...validDraft, regionCode: 'FR-IDF' }, 2026)).toHaveProperty('regionCode');
  });

  it('rejects future and unsupported birth years', () => {
    expect(validateAnalyticsProfileDraft({ ...validDraft, birthYear: 2027 }, 2026)).toHaveProperty('birthYear');
    expect(validateAnalyticsProfileDraft({ ...validDraft, birthYear: 1899 }, 2026)).toHaveProperty('birthYear');
  });
});
