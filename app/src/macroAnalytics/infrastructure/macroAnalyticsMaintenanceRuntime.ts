import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';

export type MacroAnalyticsMaintenanceRunner = (
  userId: string,
  analyticsProfile: Pick<AnalyticsProfilePort, 'get'>,
) => Promise<void>;

const skipMacroAnalyticsMaintenance: MacroAnalyticsMaintenanceRunner = async () => {};

export function selectMacroAnalyticsMaintenanceRunner(
  nativeRuntime: boolean,
  nativeRunner: MacroAnalyticsMaintenanceRunner,
): MacroAnalyticsMaintenanceRunner {
  return nativeRuntime ? nativeRunner : skipMacroAnalyticsMaintenance;
}
