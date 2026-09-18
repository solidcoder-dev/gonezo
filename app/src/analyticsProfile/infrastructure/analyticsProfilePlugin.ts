import { registerPlugin } from '@capacitor/core';
import type { AnalyticsProfile } from '../domain/analyticsProfile';

export type AnalyticsProfilePlugin = {
  get(options: { userId: string }): Promise<{ profile?: AnalyticsProfile }>;
  save(options: { profile: AnalyticsProfile }): Promise<void>;
};

export const AnalyticsProfileNativePlugin = registerPlugin<AnalyticsProfilePlugin>('AnalyticsProfilePlugin');
