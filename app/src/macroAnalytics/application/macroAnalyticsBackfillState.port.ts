export type MacroAnalyticsBackfillState = Readonly<{
  initialBackfillVersion: number;
  fullRebuildRequested: boolean;
}>;

export type MacroAnalyticsBackfillStatePort = Readonly<{
  get(userId: string): Promise<MacroAnalyticsBackfillState>;
  markInitialBackfillComplete(userId: string, version: number): Promise<void>;
  requestFullRebuild(userId: string): Promise<void>;
  clearFullRebuildRequest(userId: string): Promise<void>;
  clear(userId: string): Promise<void>;
}>;
