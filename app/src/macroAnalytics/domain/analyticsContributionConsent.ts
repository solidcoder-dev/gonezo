export const ANALYTICS_CONTRIBUTION_NOTICE_VERSION = 1 as const;

export const analyticsContributionConsentStatuses = ['GRANTED', 'DECLINED', 'WITHDRAWN'] as const;
export type AnalyticsContributionConsentStatus = typeof analyticsContributionConsentStatuses[number];

export type AnalyticsContributionConsent = Readonly<{
  userId: string;
  status: AnalyticsContributionConsentStatus;
  noticeVersion: number;
  decidedAt: string;
}>;

export type AnalyticsContributionConsentInput = AnalyticsContributionConsent;

export function createAnalyticsContributionConsent(input: AnalyticsContributionConsentInput): AnalyticsContributionConsent {
  if (!input.userId.trim()) throw new Error('Authenticated user is required.');
  if (!analyticsContributionConsentStatuses.includes(input.status)) throw new Error('Contribution consent status is invalid.');
  if (!Number.isInteger(input.noticeVersion) || input.noticeVersion < 1) throw new Error('Contribution notice version is invalid.');
  if (!Number.isFinite(Date.parse(input.decidedAt))) throw new Error('Contribution decision time is invalid.');
  return { ...input };
}

export function canContribute(consent: AnalyticsContributionConsent | null): boolean {
  return consent?.status === 'GRANTED';
}

export function grantAnalyticsContribution(userId: string, decidedAt: string): AnalyticsContributionConsent {
  return createAnalyticsContributionConsent({ userId, status: 'GRANTED', noticeVersion: ANALYTICS_CONTRIBUTION_NOTICE_VERSION, decidedAt });
}

export function declineAnalyticsContribution(userId: string, decidedAt: string): AnalyticsContributionConsent {
  return createAnalyticsContributionConsent({ userId, status: 'DECLINED', noticeVersion: ANALYTICS_CONTRIBUTION_NOTICE_VERSION, decidedAt });
}

export function withdrawAnalyticsContribution(consent: AnalyticsContributionConsent, decidedAt: string): AnalyticsContributionConsent {
  return createAnalyticsContributionConsent({ ...consent, status: 'WITHDRAWN', decidedAt });
}
