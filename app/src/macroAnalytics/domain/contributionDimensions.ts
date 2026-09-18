import type { AnalyticsPeriod } from './analyticsPeriod';
import type { ContributionProfile, ContributionProfileSex } from './contributionProfile';

export const contributionSexes = ['FEMALE', 'MALE', 'INTERSEX', 'NOT_DISCLOSED'] as const;
export type ContributionSex = typeof contributionSexes[number];

export const contributionAgeBands = ['0_17', '18_24', '25_34', '35_44', '45_54', '55_64', '65_PLUS'] as const;
export type ContributionAgeBand = typeof contributionAgeBands[number];

export type ContributionDimensions = Readonly<{
  countryCode: string;
  regionCode: string;
  sex: ContributionSex;
  ageBand: ContributionAgeBand;
}>;

const contributionSexByProfileSex = {
  female: 'FEMALE',
  male: 'MALE',
  intersex: 'INTERSEX',
  not_disclosed: 'NOT_DISCLOSED',
} satisfies Record<ContributionProfileSex, ContributionSex>;

export function deriveContributionDimensions(profile: ContributionProfile, period: AnalyticsPeriod): ContributionDimensions | null {
  const approximateAge = Number(period.value.slice(0, 4)) - profile.birthYear;
  if (!Number.isInteger(profile.birthYear) || approximateAge < 0
    || !(contributionSexesForProfile as readonly string[]).includes(profile.sex)
    || !profile.countryCode.trim() || !profile.regionCode.trim()) return null;
  const ageBand: ContributionAgeBand = approximateAge <= 17 ? '0_17'
    : approximateAge <= 24 ? '18_24'
      : approximateAge <= 34 ? '25_34'
        : approximateAge <= 44 ? '35_44'
          : approximateAge <= 54 ? '45_54'
            : approximateAge <= 64 ? '55_64' : '65_PLUS';

  return Object.freeze({
    countryCode: profile.countryCode,
    regionCode: profile.regionCode,
    sex: contributionSexByProfileSex[profile.sex],
    ageBand,
  });
}

const contributionSexesForProfile = ['female', 'male', 'intersex', 'not_disclosed'] as const;
