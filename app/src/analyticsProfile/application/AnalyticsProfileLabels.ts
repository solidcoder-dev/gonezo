import { ANALYTICS_PROFILE_COUNTRIES, ANALYTICS_PROFILE_REGIONS } from '../domain/analyticsProfile';

export function analyticsProfileLabels(profile: { countryCode: string; regionCode: string; sex: string; birthYear: number }) {
  return {
    birthYear: String(profile.birthYear),
    sex: profile.sex === 'not_disclosed' ? 'Prefer not to say' : profile.sex[0].toUpperCase() + profile.sex.slice(1),
    country: ANALYTICS_PROFILE_COUNTRIES.find((country) => country.code === profile.countryCode)?.label ?? '',
    region: (ANALYTICS_PROFILE_REGIONS[profile.countryCode] ?? []).find((region) => region.code === profile.regionCode)?.label ?? '',
  };
}
