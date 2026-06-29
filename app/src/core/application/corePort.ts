import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import type { PreferencesPort } from '../../account/application/preferences.port';
import type { AccountBalancesPort } from '../../account/application/accountBalances.port';
import type { ExpectedPort } from '../../expected/application/expected.port';
import type { MobillsImportPort, MovementsBackupPort } from '../../imports/application/imports.port';
import type { LedgerPort } from '../../ledger/application/ledger.port';
import type { MovementsQueryPort } from '../../movements/application/movements.port';
import type { RecurrencePort, SchedulingPort } from '../../scheduling/application/scheduling.port';
import type { SharingPort } from '../../sharing/application/sharing.port';
import type { TaxonomyPort } from '../../taxonomy/application/taxonomy.port';

export interface CorePort
  extends PreferencesPort,
    AccountBalancesPort,
    LedgerPort,
    TaxonomyPort,
    MobillsImportPort,
    MovementsBackupPort,
    RecurrencePort,
    SchedulingPort,
    ExpectedPort,
    MovementsQueryPort,
    AnalyticsPort,
    SharingPort {}
