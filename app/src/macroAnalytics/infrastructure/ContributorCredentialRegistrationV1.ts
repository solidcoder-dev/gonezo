import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { PublicationSigningIdentityPort } from '../application/publicationSigningIdentity.port';

export type ContributorCredentialRegistrationV1 = Readonly<{
  credentialProtocolVersion: 1;
  contributorId: AnalyticsContributorId;
  keyId: string;
  algorithm: 'ECDSA_P256_SHA256';
  publicKey: string;
  proof: string;
}>;

export async function createContributorCredentialRegistrationV1(
  contributorId: AnalyticsContributorId,
  signingIdentity: PublicationSigningIdentityPort,
): Promise<ContributorCredentialRegistrationV1> {
  const credential = await signingIdentity.getOrCreateCredential(contributorId);
  if (credential.contributorId !== contributorId) throw new Error('Signing credential contributor does not match registration');
  const proofBytes = new TextEncoder().encode(`gonezo-macro-analytics-credential-v1\n${contributorId}\n${credential.keyId}`);
  const proof = await signingIdentity.sign(contributorId, proofBytes);
  return {
    credentialProtocolVersion: 1,
    contributorId,
    keyId: credential.keyId,
    algorithm: credential.algorithm,
    publicKey: credential.publicKey,
    proof,
  };
}
