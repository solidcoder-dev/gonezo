import type { MacroAnalyticsBackfillStatePort } from '../application/macroAnalyticsBackfillState.port';
import { MacroAnalyticsLocalStorageNativePlugin } from './macroAnalyticsLocalStoragePlugin';

export class NativeMacroAnalyticsBackfillStateAdapter implements MacroAnalyticsBackfillStatePort {
  get(userId: string) {
    return MacroAnalyticsLocalStorageNativePlugin.getBackfillState({ userId });
  }

  async markInitialBackfillComplete(userId: string, version: number): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.markInitialBackfillComplete({ userId, version });
  }

  async requestFullRebuild(userId: string): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.requestFullRebuild({ userId });
  }

  async clearFullRebuildRequest(userId: string, expectedRequestVersion: number): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.clearFullRebuildRequest({ userId, expectedRequestVersion });
  }

  async clear(userId: string): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.clearBackfillState({ userId });
  }
}
