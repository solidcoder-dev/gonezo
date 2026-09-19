import { registerPlugin } from '@capacitor/core';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

export type MacroAnalyticsLocalStoragePlugin = {
  getContributorId(options: { userId: string }): Promise<{ contributorId?: string }>;
  saveContributorId(options: { userId: string; contributorId: string }): Promise<void>;
  getPublication(options: { userId: string; period: string }): Promise<{ publication?: MacroAnalyticsPublication }>;
  savePublication(options: { userId: string; publication: MacroAnalyticsPublication }): Promise<void>;
  removePublication(options: { userId: string; period: string }): Promise<void>;
  listPublications(options: { userId: string }): Promise<{ publications: MacroAnalyticsPublication[] }>;
  clearPublications(options: { userId: string }): Promise<void>;
  getLatestPublication(options: { contributorId: string; period: string }): Promise<{ publication?: MacroAnalyticsPublication }>;
  saveLatestPublication(options: { publication: MacroAnalyticsPublication }): Promise<void>;
};

export const MacroAnalyticsLocalStorageNativePlugin = registerPlugin<MacroAnalyticsLocalStoragePlugin>('MacroAnalyticsLocalStoragePlugin');
