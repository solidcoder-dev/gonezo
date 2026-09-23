import { describe, expect, it, vi } from 'vitest';
import { selectMacroAnalyticsMaintenanceRunner } from './macroAnalyticsMaintenanceRuntime';

describe('selectMacroAnalyticsMaintenanceRunner', () => {
  it('does not run native maintenance for the web runtime', async () => {
    const nativeRunner = vi.fn(async () => {});
    const runMaintenance = selectMacroAnalyticsMaintenanceRunner(false, nativeRunner);

    await runMaintenance('user-1', { get: vi.fn(async () => null) });

    expect(nativeRunner).not.toHaveBeenCalled();
  });

  it('delegates native maintenance to the native runner', async () => {
    const nativeRunner = vi.fn(async () => {});
    const analyticsProfile = { get: vi.fn(async () => null) };
    const runMaintenance = selectMacroAnalyticsMaintenanceRunner(true, nativeRunner);

    await runMaintenance('user-1', analyticsProfile);

    expect(nativeRunner).toHaveBeenCalledWith('user-1', analyticsProfile);
  });
});
