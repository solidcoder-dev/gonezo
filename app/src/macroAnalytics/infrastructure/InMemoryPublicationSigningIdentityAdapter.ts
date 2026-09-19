import type { PublicationSigningIdentityPort, AnalyticsContributorCredential } from '../application/publicationSigningIdentity.port';
import { MACRO_ANALYTICS_SIGNATURE_ALGORITHM } from '../application/publicationSigningIdentity.port';
import type { AnalyticsContributorId } from '../domain/analyticsContributorId';

export class InMemoryPublicationSigningIdentityAdapter implements PublicationSigningIdentityPort {
  private readonly credentials = new Map<AnalyticsContributorId, AnalyticsContributorCredential>();
  private readonly privateKeys = new Map<AnalyticsContributorId, CryptoKey>();

  async getOrCreateCredential(contributorId: AnalyticsContributorId): Promise<AnalyticsContributorCredential> {
    const existing = this.credentials.get(contributorId);
    if (existing) return existing;

    const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const publicKey = new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey));
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', publicKey));
    const credential = {
      contributorId,
      keyId: encodeBase64Url(digest),
      algorithm: MACRO_ANALYTICS_SIGNATURE_ALGORITHM,
      publicKey: encodeBase64Url(publicKey),
    } as const;
    this.privateKeys.set(contributorId, keyPair.privateKey);
    this.credentials.set(contributorId, credential);
    return credential;
  }

  async sign(contributorId: AnalyticsContributorId, payloadBytes: Uint8Array): Promise<string> {
    const privateKey = this.privateKeys.get(contributorId);
    if (!privateKey) throw new Error('Signing credential does not exist');
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, toArrayBuffer(payloadBytes));
    return encodeBase64Url(ecdsaP1363ToDer(new Uint8Array(signature)));
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function ecdsaP1363ToDer(signature: Uint8Array): Uint8Array {
  const half = signature.length / 2;
  const r = derInteger(signature.subarray(0, half));
  const s = derInteger(signature.subarray(half));
  const sequenceLength = r.length + s.length;
  return new Uint8Array([0x30, sequenceLength, ...r, ...s]);
}

function derInteger(value: Uint8Array): number[] {
  let firstNonZero = 0;
  while (firstNonZero < value.length - 1 && value[firstNonZero] === 0) firstNonZero += 1;
  const integer = Array.from(value.subarray(firstNonZero));
  if ((integer[0] & 0x80) !== 0) integer.unshift(0);
  return [0x02, integer.length, ...integer];
}
