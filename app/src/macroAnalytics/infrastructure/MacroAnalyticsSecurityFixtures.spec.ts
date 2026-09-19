import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const registrationUrl = new URL('../../../../contracts/macro-analytics/fixtures/security/credential-registration-v1.json', import.meta.url);
const publicationUrl = new URL('../../../../contracts/macro-analytics/fixtures/security/signed-publication-v1.json', import.meta.url);

describe('shared macro analytics security fixtures', () => {
  it('verifies the registration proof and exact signed publication payload', async () => {
    const registration = JSON.parse(await readFile(registrationUrl, 'utf8')) as {
      contributorId: string;
      keyId: string;
      publicKey: string;
      proof: string;
    };
    const signedPublication = JSON.parse(await readFile(publicationUrl, 'utf8')) as {
      contributorId: string;
      keyId: string;
      payload: string;
      signature: string;
    };
    const publicKey = await crypto.subtle.importKey('spki', toArrayBuffer(decodeBase64Url(registration.publicKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const proof = new TextEncoder().encode(`gonezo-macro-analytics-credential-v1\n${registration.contributorId}\n${registration.keyId}`);

    expect(signedPublication.contributorId).toBe(registration.contributorId);
    expect(signedPublication.keyId).toBe(registration.keyId);
    await expect(crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, toArrayBuffer(derSignatureToP1363(decodeBase64Url(registration.proof))), toArrayBuffer(proof))).resolves.toBe(true);
    await expect(crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, toArrayBuffer(derSignatureToP1363(decodeBase64Url(signedPublication.signature))), toArrayBuffer(new TextEncoder().encode(signedPublication.payload)))).resolves.toBe(true);
  });

  it('contains only pseudonymous publication fields and test cryptographic material', async () => {
    const fixtureText = `${await readFile(registrationUrl, 'utf8')}\n${await readFile(publicationUrl, 'utf8')}`.toLowerCase();

    for (const forbiddenField of ['userid', 'username', 'email', 'birthyear', 'movementid', 'accountid', 'deviceid', 'imei', 'androidid']) {
      expect(fixtureText).not.toContain(forbiddenField);
    }
  });
});

function decodeBase64Url(value: string): Uint8Array {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function derSignatureToP1363(signature: Uint8Array): Uint8Array {
  let offset = 2;
  const rLength = signature[offset + 1];
  const r = signature.subarray(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  const sLength = signature[offset + 1];
  const s = signature.subarray(offset + 2, offset + 2 + sLength);
  const result = new Uint8Array(64);
  result.set(trimInteger(r), 32 - trimInteger(r).length);
  result.set(trimInteger(s), 64 - trimInteger(s).length);
  return result;
}

function trimInteger(value: Uint8Array): Uint8Array {
  return value[0] === 0 ? value.subarray(1) : value;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
