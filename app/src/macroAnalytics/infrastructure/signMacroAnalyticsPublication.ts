import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { serializeMacroAnalyticsPublicationV1 } from './MacroAnalyticsPublicationWireV1';
import type { PublicationSigningIdentityPort } from '../application/publicationSigningIdentity.port';

export type SignedMacroAnalyticsPublication = Readonly<{
  contributorId: AnalyticsContributorId;
  keyId: string;
  algorithm: 'ECDSA_P256_SHA256';
  payload: string;
  signature: string;
}>;

export async function signMacroAnalyticsPublication(
  publication: MacroAnalyticsPublication,
  signingIdentity: PublicationSigningIdentityPort,
): Promise<SignedMacroAnalyticsPublication> {
  const credential = await signingIdentity.getOrCreateCredential(publication.contributorId);
  if (credential.contributorId !== publication.contributorId) throw new Error('Signing credential contributor does not match publication');
  const payload = serializeMacroAnalyticsPublicationV1(publication);
  const signature = await signingIdentity.sign(publication.contributorId, new TextEncoder().encode(payload));
  return { contributorId: credential.contributorId, keyId: credential.keyId, algorithm: credential.algorithm, payload, signature };
}
