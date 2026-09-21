import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { serializeMacroAnalyticsPublicationV1 } from './MacroAnalyticsPublicationWireV1';
import type { PublicationSigningIdentityPort } from '../application/publicationSigningIdentity.port';
import { serializeMacroAnalyticsPublicationV2 } from './MacroAnalyticsPublicationWireV2';
import { serializeMacroAnalyticsPublicationV3 } from './MacroAnalyticsPublicationWireV3';
import { serializeMacroAnalyticsPublicationV4 } from './MacroAnalyticsPublicationWireV4';
import { serializeMacroAnalyticsPublicationV5 } from './MacroAnalyticsPublicationWireV5';
import { serializeMacroAnalyticsPublicationV6 } from './MacroAnalyticsPublicationWireV6';

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
  const payload = publication.protocolVersion === 1 ? serializeMacroAnalyticsPublicationV1(publication)
    : publication.protocolVersion === 2 ? serializeMacroAnalyticsPublicationV2(publication)
      : publication.protocolVersion === 3 ? serializeMacroAnalyticsPublicationV3(publication)
        : publication.protocolVersion === 4 ? serializeMacroAnalyticsPublicationV4(publication)
          : publication.protocolVersion === 5 ? serializeMacroAnalyticsPublicationV5(publication) : serializeMacroAnalyticsPublicationV6(publication);
  const signature = await signingIdentity.sign(publication.contributorId, new TextEncoder().encode(payload));
  return { contributorId: credential.contributorId, keyId: credential.keyId, algorithm: credential.algorithm, payload, signature };
}
