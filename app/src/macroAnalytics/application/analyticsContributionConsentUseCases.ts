import {
  declineAnalyticsContribution,
  grantAnalyticsContribution,
  withdrawAnalyticsContribution,
  type AnalyticsContributionConsent,
} from '../domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';

export function clearPendingMacroAnalyticsPublications(userId: string, outbox: Pick<MacroAnalyticsOutboxPort, 'clear'>): Promise<void> {
  return outbox.clear(userId);
}

export type ConsentClock = () => string;

export function getContributionConsent(port: AnalyticsContributionConsentPort, userId: string): Promise<AnalyticsContributionConsent | null> {
  return port.get(userId);
}

export async function grantContributionConsent(port: AnalyticsContributionConsentPort, userId: string, clock: ConsentClock): Promise<AnalyticsContributionConsent> {
  const decision = grantAnalyticsContribution(userId, clock());
  await port.save(decision);
  return decision;
}

export async function declineContributionConsent(port: AnalyticsContributionConsentPort, userId: string, clock: ConsentClock): Promise<AnalyticsContributionConsent> {
  const decision = declineAnalyticsContribution(userId, clock());
  await port.save(decision);
  return decision;
}

export async function withdrawContributionConsent(
  port: AnalyticsContributionConsentPort,
  userId: string,
  clock: ConsentClock,
  outbox?: Pick<MacroAnalyticsOutboxPort, 'clear'>,
): Promise<AnalyticsContributionConsent> {
  const existing = await port.get(userId);
  if (!existing || existing.status !== 'GRANTED') throw new Error('Only granted contribution consent can be withdrawn.');
  const decision = withdrawAnalyticsContribution(existing, clock());
  if (outbox) await clearPendingMacroAnalyticsPublications(userId, outbox);
  await port.save(decision);
  return decision;
}
