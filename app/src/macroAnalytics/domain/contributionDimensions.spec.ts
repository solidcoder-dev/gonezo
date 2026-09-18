import { describe, expect, it } from 'vitest';
import { deriveContributionDimensions } from './contributionDimensions';
import { createAnalyticsPeriod } from './analyticsPeriod';

describe('macro analytics contribution dimensions', () => {
  it('maps demographic values and derives age from the contribution period', () => {
    expect(deriveContributionDimensions({
      birthYear: 1995,
      sex: 'female',
      countryCode: 'ES',
      regionCode: 'ES-CN',
    }, createAnalyticsPeriod('2026-09'))).toEqual({
      countryCode: 'ES',
      regionCode: 'ES-CN',
      sex: 'FEMALE',
      ageBand: '25_34',
    });
  });

  it.each([
    [17, '0_17'], [18, '18_24'], [24, '18_24'], [25, '25_34'], [34, '25_34'],
    [35, '35_44'], [44, '35_44'], [45, '45_54'], [54, '45_54'],
    [55, '55_64'], [64, '55_64'], [65, '65_PLUS'],
  ] as const)('assigns approximate age %s to %s', (age, ageBand) => {
    expect(deriveContributionDimensions({
      birthYear: 2026 - age,
      sex: 'not_disclosed',
      countryCode: 'ES',
      regionCode: 'ES-CN',
    }, createAnalyticsPeriod('2026-01'))?.ageBand).toBe(ageBand);
  });

  it('derives the age band from the contribution year, including historical periods', () => {
    const profile = { birthYear: 1995, sex: 'female' as const, countryCode: 'ES', regionCode: 'ES-CN' };
    expect(deriveContributionDimensions(profile, createAnalyticsPeriod('2019-06'))?.ageBand).toBe('18_24');
    expect(deriveContributionDimensions(profile, createAnalyticsPeriod('2026-06'))?.ageBand).toBe('25_34');
  });
});
