import type {
  MobillsImportInput,
  MobillsImportResult,
  MobillsImportRowResult,
} from '../../domain/corePort';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import { WebMobillsDuplicateTracker } from './coreAdapterWebMobillsDuplicateTracker';
import { normalizeWebMobillsImportPolicy } from './coreAdapterWebMobillsImportPolicy';
import { readWebMobillsImportRows } from './coreAdapterWebMobillsImportRows';
import { WebMobillsRowImporter } from './coreAdapterWebMobillsRowImporter';
import type { WebCoreState } from './coreAdapterWebState';
import type { WebTaxonomyService } from './coreAdapterWebTaxonomyService';

export type WebMobillsImportWorkflowOptions = {
  state: WebCoreState;
  ledger: WebLedgerService;
  taxonomy: WebTaxonomyService;
};

export class WebMobillsImportWorkflow {
  private readonly state: WebCoreState;

  private readonly rowImporter: WebMobillsRowImporter;

  constructor(options: WebMobillsImportWorkflowOptions) {
    this.state = options.state;
    this.rowImporter = new WebMobillsRowImporter({
      ledger: options.ledger,
      taxonomy: options.taxonomy,
    });
  }

  async import(input: MobillsImportInput): Promise<MobillsImportResult> {
    const policy = normalizeWebMobillsImportPolicy(input.policy);
    const parsedRows = readWebMobillsImportRows(input.fileBase64);
    const duplicateTracker = new WebMobillsDuplicateTracker(
      this.state.mobillsImportFingerprintToTransactionId,
      policy,
    );
    const rows: MobillsImportRowResult[] = [];

    for (const row of parsedRows.rows) {
      if (row.status !== 'ready') {
        rows.push(row.result);
        continue;
      }

      const duplicateResult = duplicateTracker.duplicateResult(row);
      if (duplicateResult) {
        rows.push(duplicateResult);
        continue;
      }

      try {
        const transactionId = await this.rowImporter.importRow(row, policy);
        rows.push({
          sourceLine: row.sourceLine,
          status: 'imported',
          transactionId,
        });
        duplicateTracker.remember(row, transactionId);
      } catch (err) {
        rows.push(failedImportRow(row.sourceLine, err));
      }
    }

    return summarizeMobillsImportRows(rows);
  }
}

function failedImportRow(sourceLine: number, err: unknown): MobillsImportRowResult {
  const message = err instanceof Error ? err.message : 'Import failed';
  return {
    sourceLine,
    status: 'failed',
    errorCode: message
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
    errorMessage: message,
  };
}

function summarizeMobillsImportRows(rows: MobillsImportRowResult[]): MobillsImportResult {
  const importedCount = rows.filter((row) => row.status === 'imported').length;
  const failedCount = rows.filter((row) => row.status === 'failed').length;
  const skippedCount = rows.filter((row) => row.status === 'skipped').length;
  return {
    totalRows: rows.length,
    importedCount,
    failedCount,
    skippedCount,
    rows,
  };
}
