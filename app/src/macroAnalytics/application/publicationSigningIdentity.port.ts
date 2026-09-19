import type { AnalyticsContributorId } from '../domain/analyticsContributorId';

export const MACRO_ANALYTICS_SIGNATURE_ALGORITHM = 'ECDSA_P256_SHA256' as const;

export type AnalyticsContributorCredential = Readonly<{
  contributorId: AnalyticsContributorId;
  keyId: string;
  algorithm: typeof MACRO_ANALYTICS_SIGNATURE_ALGORITHM;
  publicKey: string;
}>;

export type PublicationSigningIdentityPort = Readonly<{
  getOrCreateCredential(contributorId: AnalyticsContributorId): Promise<AnalyticsContributorCredential>;
  sign(contributorId: AnalyticsContributorId, payloadBytes: Uint8Array): Promise<string>;
}>;
