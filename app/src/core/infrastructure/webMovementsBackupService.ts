import type { LedgerPort } from '../../ledger/application/ledger.port';
import type { TaxonomyPort } from '../../taxonomy/application/taxonomy.port';
import type { MovementsBackupExportResult } from '../../imports/application/imports.port';
import {
  collectWebMovementsBackupExport,
  summarizeWebMovementsBackupExport,
  webMovementsBackupFileName,
} from '../../imports/infrastructure/webBackup';
import type { WebBackupDownloader, WebClock } from './webRuntimeDependencies';

type WebMovementsBackupSource = Pick<LedgerPort & TaxonomyPort, 'ledgerListAccounts' | 'ledgerListTransactions' | 'taxonomyListCategories' | 'taxonomyListTags'>;

export class WebMovementsBackupService {
  private readonly clock: WebClock;
  private readonly backupDownloader: WebBackupDownloader;

  constructor(clock: WebClock, backupDownloader: WebBackupDownloader) {
    this.clock = clock;
    this.backupDownloader = backupDownloader;
  }

  async export(source: WebMovementsBackupSource): Promise<MovementsBackupExportResult> {
    const exportData = await collectWebMovementsBackupExport(source, this.clock.nowIso());
    const fileName = webMovementsBackupFileName(exportData.exportedAt);
    const json = JSON.stringify(exportData, null, 2);
    this.backupDownloader.downloadJson(fileName, json);
    return summarizeWebMovementsBackupExport(exportData, fileName);
  }
}
