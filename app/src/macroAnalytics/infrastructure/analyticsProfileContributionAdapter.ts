import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import type { AnalyticsProfileSex } from '../../analyticsProfile/domain/analyticsProfile';
import type { ContributionProfileSex } from '../domain/contributionProfile';
import type { ContributionProfileSourcePort } from '../application/contributionProfileSource.port';

const contributionSexByAnalyticsProfileSex = {
  female: 'female',
  male: 'male',
  intersex: 'intersex',
  not_disclosed: 'not_disclosed',
} satisfies Record<AnalyticsProfileSex, ContributionProfileSex>;

export function createAnalyticsProfileContributionAdapter(profiles: Pick<AnalyticsProfilePort, 'get'>): ContributionProfileSourcePort {
  return {
    async get(userId) {
      const profile = await profiles.get(userId);
      if (!profile || !Number.isInteger(profile.birthYear) || !profile.countryCode.trim() || !profile.regionCode.trim()) return null;
      return Object.freeze({
        birthYear: profile.birthYear,
        sex: contributionSexByAnalyticsProfileSex[profile.sex],
        countryCode: profile.countryCode,
        regionCode: profile.regionCode,
      });
    },
  };
}
