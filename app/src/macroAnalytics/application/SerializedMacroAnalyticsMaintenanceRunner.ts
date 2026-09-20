export class SerializedMacroAnalyticsMaintenanceRunner {
  private readonly activeByUser = new Map<string, Readonly<{ promise: Promise<void>; started: () => boolean; requestAnotherRun: () => void }>>();
  private sequence: Promise<void> = Promise.resolve();

  run(userId: string, maintenance: () => Promise<unknown>): Promise<void> {
    const active = this.activeByUser.get(userId);
    if (active) {
      if (active.started()) active.requestAnotherRun();
      return active.promise;
    }
    let runStarted = false;
    let runAgain = false;
    const current = this.sequence.catch(() => {}).then(async () => {
      do {
        runStarted = true;
        runAgain = false;
        await maintenance();
      } while (runAgain);
    });
    const tracked = current.finally(() => {
      if (this.activeByUser.get(userId)?.promise === tracked) this.activeByUser.delete(userId);
    });
    this.activeByUser.set(userId, {
      promise: tracked,
      started: () => runStarted,
      requestAnotherRun: () => { runAgain = true; },
    });
    this.sequence = tracked.catch(() => {});
    return tracked;
  }
}
