import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { signMacroAnalyticsPublication } from './signMacroAnalyticsPublication';
import { InMemoryPublicationSigningIdentityAdapter } from './InMemoryPublicationSigningIdentityAdapter';
import { createContributorCredentialRegistrationV1 } from './ContributorCredentialRegistrationV1';
import { serializeMacroAnalyticsPublicationV3 } from './MacroAnalyticsPublicationWireV3';
import { serializeMacroAnalyticsPublicationV1 } from './MacroAnalyticsPublicationWireV1';
import { serializeMacroAnalyticsPublicationV2 } from './MacroAnalyticsPublicationWireV2';

const contributorId = createAnalyticsContributorId('opaque-random-id');
const publication = createMacroAnalyticsPublication({
  contributorId,
  period: createAnalyticsPeriod('2026-09'),
  revision: 1,
  contribution: {
    schemaVersion: 1,
    period: createAnalyticsPeriod('2026-09'),
    dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
    financial: { currencies: [] },
  },
});

describe('macro analytics publication signing', () => {
  it('signs and preserves the exact serialized wire payload', async () => {
    const signingIdentity = new InMemoryPublicationSigningIdentityAdapter();
    const credential = await signingIdentity.getOrCreateCredential(contributorId);
    const signed = await signMacroAnalyticsPublication(publication, signingIdentity);

    expect(signed.payload).toBe('{"protocolVersion":1,"contributorId":"opaque-random-id","period":"2026-09","revision":1,"contribution":{"schemaVersion":1,"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[]}}}');
    expect(signed.signature).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(signed.keyId).toBe(credential.keyId);
    expect('privateKey' in credential).toBe(false);
  });

  it('signs exact V2 publication bytes', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const v2 = createMacroAnalyticsPublication({
      contributorId,
      period,
      revision: 2,
      contribution: {
        schemaVersion: 2,
        period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [] },
        categories: { currencies: [] },
      },
    });
    const signingIdentity = {
      getOrCreateCredential: vi.fn(async () => ({ contributorId, keyId: 'v2-key', algorithm: 'ECDSA_P256_SHA256' as const, publicKey: 'public' })),
      sign: vi.fn(async () => 'signature'),
    };
    const payload = '{"protocolVersion":2,"contributorId":"opaque-random-id","period":"2026-09","revision":2,"contribution":{"schemaVersion":2,"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[]},"categories":{"currencies":[]}}}';

    const signed = await signMacroAnalyticsPublication(v2, signingIdentity);

    expect(signed.payload).toBe(payload);
    expect(signingIdentity.sign).toHaveBeenCalledWith(contributorId, new TextEncoder().encode(payload));
  });

  it('serializes and signs exact V3 publication bytes without recurring identities', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const v3 = createMacroAnalyticsPublication({
      contributorId, period, revision: 5,
      contribution: {
        schemaVersion: 3, period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [] }, categories: { currencies: [] },
        recurring: { currencies: [{ currency: 'EUR', buckets: [{ source: 'SCHEDULED', kind: 'EXPENSE', amount: '0', occurrenceCount: 1, seriesCount: 1 }] }] },
      },
    });
    const signingIdentity = {
      getOrCreateCredential: vi.fn(async () => ({ contributorId, keyId: 'v3-key', algorithm: 'ECDSA_P256_SHA256' as const, publicKey: 'public' })),
      sign: vi.fn(async () => 'signature'),
    };
    const payload = '{"protocolVersion":3,"contributorId":"opaque-random-id","period":"2026-09","revision":5,"contribution":{"schemaVersion":3,"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[]},"categories":{"currencies":[]},"recurring":{"currencies":[{"currency":"EUR","buckets":[{"source":"SCHEDULED","kind":"EXPENSE","amount":"0","occurrenceCount":1,"seriesCount":1}]}]}}}';
    expect(v3.protocolVersion).toBe(3);
    expect(serializeMacroAnalyticsPublicationV3(v3)).toBe(payload);
    expect(() => serializeMacroAnalyticsPublicationV1(v3)).toThrow('requires a V1 publication');
    expect(() => serializeMacroAnalyticsPublicationV2(v3)).toThrow('requires a V2 publication');
    const signed = await signMacroAnalyticsPublication(v3, signingIdentity);
    expect(signed.payload).toBe(payload);
    expect(signingIdentity.sign).toHaveBeenCalledWith(contributorId, new TextEncoder().encode(payload));
  });

  it('reuses one credential per contributor and isolates contributors', async () => {
    const signingIdentity = new InMemoryPublicationSigningIdentityAdapter();
    const first = await signingIdentity.getOrCreateCredential(contributorId);
    const repeated = await signingIdentity.getOrCreateCredential(contributorId);
    const second = await signingIdentity.getOrCreateCredential(createAnalyticsContributorId('another-contributor'));

    expect(repeated).toEqual(first);
    expect(second.keyId).not.toBe(first.keyId);
    expect(second.publicKey).not.toBe(first.publicKey);
  });

  it('proves credential ownership over the exact V1 registration bytes', async () => {
    const signingIdentity = {
      getOrCreateCredential: vi.fn(async () => ({ contributorId, keyId: 'derived-key-id', algorithm: 'ECDSA_P256_SHA256' as const, publicKey: 'spki-public-key' })),
      sign: vi.fn(async () => 'base64url-proof'),
    };

    const registration = await createContributorCredentialRegistrationV1(contributorId, signingIdentity);

    expect(signingIdentity.sign).toHaveBeenCalledWith(contributorId, new TextEncoder().encode('gonezo-macro-analytics-credential-v1\nopaque-random-id\nderived-key-id'));
    expect(registration).toEqual({ credentialProtocolVersion: 1, contributorId, keyId: 'derived-key-id', algorithm: 'ECDSA_P256_SHA256', publicKey: 'spki-public-key', proof: 'base64url-proof' });
  });
});
