import { contributionAgeBands, contributionSexes, type ContributionAgeBand, type ContributionDimensions, type ContributionSex } from './contributionDimensions';

export type CohortInput = Readonly<{
  countryCode?: string;
  regionCode?: string;
  sex?: ContributionSex;
  ageBand?: ContributionAgeBand;
}>;

export type Cohort = Readonly<{
  countryCode?: string;
  regionCode?: string;
  sex?: ContributionSex;
  ageBand?: ContributionAgeBand;
  includes(dimensions: ContributionDimensions): boolean;
}>;

export function createCohort(input: CohortInput = {}): Cohort {
  const countryCode = normalizeCode(input.countryCode, 'countryCode');
  const regionCode = normalizeCode(input.regionCode, 'regionCode');
  if (regionCode && !countryCode) throw new Error('A regionCode filter requires a countryCode');
  if (input.sex && !(contributionSexes as readonly string[]).includes(input.sex)) throw new Error('Unsupported cohort sex');
  if (input.ageBand && !(contributionAgeBands as readonly string[]).includes(input.ageBand)) throw new Error('Unsupported cohort ageBand');
  return Object.freeze({
    ...(countryCode ? { countryCode } : {}),
    ...(regionCode ? { regionCode } : {}),
    ...(input.sex ? { sex: input.sex } : {}),
    ...(input.ageBand ? { ageBand: input.ageBand } : {}),
    includes(dimensions: ContributionDimensions) {
      return (!countryCode || dimensions.countryCode.trim().toUpperCase() === countryCode)
        && (!regionCode || dimensions.regionCode.trim().toUpperCase() === regionCode)
        && (!input.sex || dimensions.sex === input.sex)
        && (!input.ageBand || dimensions.ageBand === input.ageBand);
    },
  });
}

function normalizeCode(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toUpperCase();
  if (!normalized || (name === 'countryCode' && !/^[A-Z]{2}$/.test(normalized))) throw new Error(`Invalid cohort ${name}`);
  return normalized;
}
