import { describe, expect, it } from 'vitest';
import { createCohort } from './cohort';

const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

describe('Cohort', () => {
  it('matches no filters and normalized combined dimensions', () => {
    expect(createCohort().includes(dimensions)).toBe(true);
    expect(createCohort({ countryCode: ' es ', regionCode: 'es-cn', sex: 'FEMALE', ageBand: '25_34' }).includes(dimensions)).toBe(true);
    expect(createCohort({ countryCode: 'ES' }).includes(dimensions)).toBe(true);
    expect(createCohort({ countryCode: 'ES', regionCode: 'ES-CN' }).includes(dimensions)).toBe(true);
    expect(createCohort({ sex: 'FEMALE' }).includes(dimensions)).toBe(true);
    expect(createCohort({ ageBand: '25_34' }).includes(dimensions)).toBe(true);
    expect(createCohort({ sex: 'MALE' }).includes(dimensions)).toBe(false);
    expect(createCohort({ ageBand: '35_44' }).includes(dimensions)).toBe(false);
  });

  it('rejects a region without a country and invalid country codes', () => {
    expect(() => createCohort({ regionCode: 'ES-CN' })).toThrow('requires a countryCode');
    expect(() => createCohort({ countryCode: 'Spain' })).toThrow('Invalid cohort countryCode');
  });
});
