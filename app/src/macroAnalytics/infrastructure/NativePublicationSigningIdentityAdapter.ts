import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { PublicationSigningIdentityPort } from '../application/publicationSigningIdentity.port';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { MACRO_ANALYTICS_SIGNATURE_ALGORITHM } from '../application/publicationSigningIdentity.port';
import { MacroAnalyticsSigningIdentityNativePlugin } from './macroAnalyticsSigningIdentityPlugin';

export class NativePublicationSigningIdentityAdapter implements PublicationSigningIdentityPort {
  async getOrCreateCredential(contributorId: AnalyticsContributorId) {
    const credential = await MacroAnalyticsSigningIdentityNativePlugin.getOrCreateCredential({ contributorId });
    if (credential.algorithm !== MACRO_ANALYTICS_SIGNATURE_ALGORITHM) throw new Error('Unsupported macro analytics signing algorithm');
    return { ...credential, contributorId: createAnalyticsContributorId(credential.contributorId) };
  }

  async sign(contributorId: AnalyticsContributorId, payloadBytes: Uint8Array): Promise<string> {
    const signature = await MacroAnalyticsSigningIdentityNativePlugin.sign({ contributorId, payloadBase64Url: encodeBase64Url(payloadBytes) });
    return signature.signature;
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
