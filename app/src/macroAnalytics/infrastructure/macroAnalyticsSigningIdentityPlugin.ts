import { registerPlugin } from '@capacitor/core';
import type { AnalyticsContributorCredential } from '../application/publicationSigningIdentity.port';

export type MacroAnalyticsSigningIdentityPlugin = {
  getOrCreateCredential(options: { contributorId: string }): Promise<Omit<AnalyticsContributorCredential, 'contributorId'> & { contributorId: string }>;
  sign(options: { contributorId: string; payloadBase64Url: string }): Promise<{ signature: string }>;
};

export const MacroAnalyticsSigningIdentityNativePlugin = registerPlugin<MacroAnalyticsSigningIdentityPlugin>('MacroAnalyticsSigningIdentityPlugin');
