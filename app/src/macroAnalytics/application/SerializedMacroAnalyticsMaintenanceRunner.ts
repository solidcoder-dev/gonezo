type ActiveMaintenanceRun = {
  promise: Promise<void>;
  started: boolean;
  runAgain: boolean;
};

export class SerializedMacroAnalyticsMaintenanceRunner {
  private readonly activeByUser = new Map<string, ActiveMaintenanceRun>();
  private sequence: Promise<void> = Promise.resolve();

  run(userId: string, maintenance: () => Promise<unknown>): Promise<void> {
    const active = this.activeByUser.get(userId);
    if (active) {
      if (active.started) active.runAgain = true;
      return active.promise;
    }
    const run: ActiveMaintenanceRun = { promise: Promise.resolve(), started: false, runAgain: false };
    const current = this.sequence.catch(() => {}).then(async () => {
      let failure: unknown;
      let failed = false;
      do {
        run.started = true;
        run.runAgain = false;
        try {
          await maintenance();
        } catch (error) {
          failure = error;
          failed = true;
        }
      } while (run.runAgain);
      if (failed) throw failure;
    });
    const tracked = current.finally(() => {
      if (this.activeByUser.get(userId) === run) this.activeByUser.delete(userId);
    });
    run.promise = tracked;
    this.activeByUser.set(userId, run);
    this.sequence = tracked.catch(() => {});
    return tracked;
  }
}
