export type MacroAnalyticsBackfillState = Readonly<{
  initialBackfillVersion: number;
  fullRebuildRequested: boolean;
  fullRebuildRequestVersion: number;
}>;

export type MacroAnalyticsBackfillStatePort = Readonly<{
  get(userId: string): Promise<MacroAnalyticsBackfillState>;
  markInitialBackfillComplete(userId: string, version: number): Promise<void>;
  requestFullRebuild(userId: string): Promise<void>;
  clearFullRebuildRequest(userId: string, expectedRequestVersion: number): Promise<void>;
  clear(userId: string): Promise<void>;
}>;
