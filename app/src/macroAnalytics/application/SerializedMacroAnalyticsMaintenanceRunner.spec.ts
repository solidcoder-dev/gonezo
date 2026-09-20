import { describe, expect, it, vi } from 'vitest';
import { SerializedMacroAnalyticsMaintenanceRunner } from './SerializedMacroAnalyticsMaintenanceRunner';

describe('SerializedMacroAnalyticsMaintenanceRunner', () => {
  it('coalesces simultaneous triggers for one user into one maintenance run', async () => {
    const runner = new SerializedMacroAnalyticsMaintenanceRunner();
    let finish!: () => void;
    const maintenance = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const first = runner.run('u', maintenance);
    const second = runner.run('u', maintenance);
    expect(maintenance).toHaveBeenCalledTimes(0);
    await vi.waitFor(() => expect(maintenance).toHaveBeenCalledTimes(1));
    expect(maintenance).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all([first, second]);
  });

  it('runs queued work again when a trigger arrives during an active run', async () => {
    const runner = new SerializedMacroAnalyticsMaintenanceRunner();
    let finishFirst!: () => void;
    const maintenance = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }))
      .mockResolvedValue(undefined);
    const first = runner.run('u', maintenance);
    await vi.waitFor(() => expect(maintenance).toHaveBeenCalledTimes(1));
    const second = runner.run('u', maintenance);
    finishFirst();
    await Promise.all([first, second]);

    expect(maintenance).toHaveBeenCalledTimes(2);
  });
});
