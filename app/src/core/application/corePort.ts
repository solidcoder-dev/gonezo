import type { PreferencesCorePort } from '../../account/application/preferencesCore.port';
import type { ExpectedCorePort } from '../../expected/application/expectedCore.port';
import type { MobillsImportCorePort, MovementsBackupCorePort } from '../../imports/application/importsCore.port';
import type { LedgerCorePort } from '../../ledger/application/ledgerCore.port';
import type { MovementsQueryCorePort } from '../../movements/application/movementsCore.port';
import type { RecurrenceCorePort, SchedulingCorePort } from '../../scheduling/application/schedulingCore.port';
import type { TaxonomyCorePort } from '../../taxonomy/application/taxonomyCore.port';

export interface CorePort
  extends PreferencesCorePort,
    LedgerCorePort,
    TaxonomyCorePort,
    MobillsImportCorePort,
    MovementsBackupCorePort,
    RecurrenceCorePort,
    SchedulingCorePort,
    ExpectedCorePort,
    MovementsQueryCorePort {}
