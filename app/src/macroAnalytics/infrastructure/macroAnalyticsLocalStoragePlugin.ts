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
  listLatestPublications(options: { period: string }): Promise<{ publications: MacroAnalyticsPublication[] }>;
  enqueueRebuildPeriod(options: { userId: string; period: string }): Promise<void>;
  listRebuildPeriods(options: { userId: string }): Promise<{ periods: string[] }>;
  removeRebuildPeriod(options: { userId: string; period: string }): Promise<void>;
  clearRebuildPeriods(options: { userId: string }): Promise<void>;
  getBackfillState(options: { userId: string }): Promise<{ initialBackfillVersion: number; fullRebuildRequested: boolean }>;
  markInitialBackfillComplete(options: { userId: string; version: number }): Promise<void>;
  requestFullRebuild(options: { userId: string }): Promise<void>;
  clearFullRebuildRequest(options: { userId: string }): Promise<void>;
  clearBackfillState(options: { userId: string }): Promise<void>;
};

export const MacroAnalyticsLocalStorageNativePlugin = registerPlugin<MacroAnalyticsLocalStoragePlugin>('MacroAnalyticsLocalStoragePlugin');
