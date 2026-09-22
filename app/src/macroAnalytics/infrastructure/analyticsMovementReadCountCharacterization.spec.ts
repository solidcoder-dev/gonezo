import { describe, expect, it, vi } from 'vitest';
import { buildMacroAnalyticsContribution } from '../application/buildMacroAnalyticsContribution';
import { createAnalyticsFinancialFactSource } from './analyticsFinancialFactSource';
import { createAnalyticsCategoryFactSource } from './analyticsCategoryFactSource';
import { createAnalyticsRecurringFactSource } from './analyticsRecurringFactSource';
import { createAnalyticsSharingFactSource } from './analyticsSharingFactSource';
import { createAnalyticsMerchantFactSource } from './analyticsMerchantFactSource';
import { createAnalyticsTagUsageFactSource } from './analyticsTagUsageFactSource';
import { createCanonicalMerchantResolver } from './canonicalMerchantResolver';
import { canonicalMerchantCatalog } from './canonicalMerchantCatalog';
import { createAnalyticsContributionConsent, type AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import type { ContributionProfile } from '../domain/contributionProfile';

const profile: ContributionProfile = { birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' };
const granted = createAnalyticsContributionConsent({ userId: 'private-user-id', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-09-18T10:00:00Z' });

describe('analytics movement read count characterization', () => {
  it('records six current V7 movement-fact reads', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [] }));
    const reader = { analyticsListMovementFacts };
    const consent = { get: vi.fn(async (): Promise<AnalyticsContributionConsent> => granted) };
    const sources = {
      consent,
      profile: { get: vi.fn(async () => profile) },
      accountBalanceFacts: { listAccountBalanceFacts: vi.fn(async () => []) },
      financialFacts: createAnalyticsFinancialFactSource(reader),
      categoryFacts: createAnalyticsCategoryFactSource(reader),
      recurringFacts: createAnalyticsRecurringFactSource(reader),
      sharingFacts: createAnalyticsSharingFactSource(reader),
      merchantFacts: createAnalyticsMerchantFactSource(reader, createCanonicalMerchantResolver(canonicalMerchantCatalog)),
      tagUsageFacts: createAnalyticsTagUsageFactSource(reader),
    };

    await buildMacroAnalyticsContribution(sources, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' });

    expect(analyticsListMovementFacts).toHaveBeenCalledTimes(6);
  });
});
