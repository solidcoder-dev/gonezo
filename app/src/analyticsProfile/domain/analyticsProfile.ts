export const ANALYTICS_PROFILE_SEXES = ['female', 'male', 'intersex', 'not_disclosed'] as const;
export type AnalyticsProfileSex = typeof ANALYTICS_PROFILE_SEXES[number];

export type AnalyticsProfile = {
  readonly userId: string;
  readonly birthYear: number;
  readonly sex: AnalyticsProfileSex;
  readonly countryCode: string;
  readonly regionCode: string;
  readonly completedAt: string;
  readonly updatedAt: string;
};

export type AnalyticsProfileDraft = Omit<AnalyticsProfile, 'completedAt' | 'updatedAt'>;

export function validateAnalyticsProfileDraft(draft: Omit<AnalyticsProfileDraft, 'sex'> & { sex: AnalyticsProfileSex | '' }, currentYear = new Date().getFullYear()): Partial<Record<'birthYear' | 'sex' | 'countryCode' | 'regionCode', string>> {
  const errors: Partial<Record<keyof AnalyticsProfileDraft, string>> = {};
  if (!Number.isInteger(draft.birthYear) || draft.birthYear < 1900 || draft.birthYear > currentYear) errors.birthYear = 'Enter a valid year of birth.';
  if (draft.sex === '' || !ANALYTICS_PROFILE_SEXES.includes(draft.sex)) errors.sex = 'Select an option.';
  const regions = ANALYTICS_PROFILE_REGIONS[draft.countryCode];
  if (!regions) errors.countryCode = 'Select your country.';
  else if (!regions.some((region) => region.code === draft.regionCode)) errors.regionCode = 'Select a region for your country.';
  return errors;
}

export const ANALYTICS_PROFILE_COUNTRIES = [
  { code: 'BR', label: 'Brazil' },
  { code: 'DE', label: 'Germany' },
  { code: 'ES', label: 'Spain' },
  { code: 'FR', label: 'France' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
] as const;

export const ANALYTICS_PROFILE_REGIONS: Readonly<Record<string, readonly { code: string; label: string }[]>> = {
  BR: [{ code: 'BR-SP', label: 'São Paulo' }, { code: 'BR-RJ', label: 'Rio de Janeiro' }],
  DE: [{ code: 'DE-BE', label: 'Berlin' }, { code: 'DE-BY', label: 'Bavaria' }],
  ES: [{ code: 'ES-CN', label: 'Canary Islands' }, { code: 'ES-MD', label: 'Community of Madrid' }, { code: 'ES-CT', label: 'Catalonia' }],
  FR: [{ code: 'FR-IDF', label: 'Île-de-France' }, { code: 'FR-ARA', label: 'Auvergne-Rhône-Alpes' }],
  GB: [{ code: 'GB-ENG', label: 'England' }, { code: 'GB-SCT', label: 'Scotland' }, { code: 'GB-WLS', label: 'Wales' }, { code: 'GB-NIR', label: 'Northern Ireland' }],
  US: [{ code: 'US-CA', label: 'California' }, { code: 'US-NY', label: 'New York' }, { code: 'US-TX', label: 'Texas' }],
};

export function isAnalyticsProfileComplete(profile: AnalyticsProfile | null): profile is AnalyticsProfile {
  return profile !== null && Object.keys(validateAnalyticsProfileDraft(profile)).length === 0;
}
