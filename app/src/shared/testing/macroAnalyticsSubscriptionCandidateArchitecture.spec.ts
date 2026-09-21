import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Macro Analytics subscription candidate privacy boundary', () => {
  it('keeps the fact limited to its anonymous usage fields', () => {
    const fact = readFileSync(resolve('src/macroAnalytics/domain/subscriptionCandidateUsageFact.ts'), 'utf8');
    const forbidden = /merchant|merchantKey|displayName|seriesId|recurringMovementId|occurrenceId|frequency|interval|description|categoryId|tagId/iu;

    expect(fact).not.toMatch(forbidden);
  });

  it('keeps the adapter dependent on the Analytics application contract and status only', () => {
    const adapter = readFileSync(resolve('src/macroAnalytics/infrastructure/analyticsSubscriptionCandidateUsageFactAdapter.ts'), 'utf8');
    const source = readFileSync(resolve('src/macroAnalytics/infrastructure/analyticsSubscriptionCandidateUsageFactSource.ts'), 'utf8');

    expect(adapter).not.toMatch(/subscriptionCandidateClassifier|merchant|cadence|recurringMovementId/iu);
    expect(source).toContain("../../analytics/application/analytics.port");
    expect(source).not.toMatch(/analytics\/(?:domain|infrastructure)\//u);
  });

  it('serializes no merchant or recurrence series evidence', () => {
    const fact = {
      id: 'fact-one/subscription-candidate', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED',
      currency: 'EUR', amount: '0', status: 'CANDIDATE',
    };

    expect(JSON.stringify(fact)).not.toMatch(/merchant|series|recurringMovementId|occurrenceId/iu);
  });
});
