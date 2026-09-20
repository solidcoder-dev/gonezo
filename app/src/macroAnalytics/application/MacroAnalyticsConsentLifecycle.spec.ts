import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { withMacroAnalyticsConsentLifecycle } from './MacroAnalyticsConsentLifecycle';

describe('withMacroAnalyticsConsentLifecycle', () => {
  it('requests a full rebuild after consent is granted', async () => {
    const base = { get: vi.fn(async () => null), save: vi.fn(async () => {}) };
    const state = { requestFullRebuild: vi.fn(async () => {}) };
    const lifecycle = withMacroAnalyticsConsentLifecycle(base, {
      backfillState: state,
      rebuildQueue: { clear: vi.fn(async () => {}) },
      outbox: { clear: vi.fn(async () => {}) },
    });

    await lifecycle.save(createAnalyticsContributionConsent({ userId: 'u', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-01-01T00:00:00Z' }));

    expect(base.save).toHaveBeenCalledOnce();
    expect(state.requestFullRebuild).toHaveBeenCalledWith('u');
  });

  it('clears pending work and outbox when consent is withdrawn', async () => {
    const base = { get: vi.fn(async () => createAnalyticsContributionConsent({ userId: 'u', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-01-01T00:00:00Z' })), save: vi.fn(async () => {}) };
    const queue = { clear: vi.fn(async () => {}) };
    const outbox = { clear: vi.fn(async () => {}) };
    const lifecycle = withMacroAnalyticsConsentLifecycle(base, {
      backfillState: { requestFullRebuild: vi.fn(async () => {}) }, rebuildQueue: queue, outbox,
    });

    await lifecycle.save(createAnalyticsContributionConsent({ userId: 'u', status: 'WITHDRAWN', noticeVersion: 1, decidedAt: '2026-01-02T00:00:00Z' }));

    expect(queue.clear).toHaveBeenCalledWith('u');
    expect(outbox.clear).toHaveBeenCalledWith('u');
  });
});
