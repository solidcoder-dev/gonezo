import type { MobillsImportRowResult } from '../../../application/imports.port';
import type { WebAppState } from '../../../../core/infrastructure/webAppState';
import type { WebMobillsImportPolicy } from './webMobillsImportPolicy';
import type { WebMobillsImportReadyRow } from './webMobillsImportRows';

export class WebMobillsDuplicateTracker {
  private readonly fingerprints: WebAppState['mobillsImportFingerprintToTransactionId'];

  private readonly policy: WebMobillsImportPolicy;

  constructor(
    fingerprints: WebAppState['mobillsImportFingerprintToTransactionId'],
    policy: WebMobillsImportPolicy,
  ) {
    this.fingerprints = fingerprints;
    this.policy = policy;
  }

  duplicateResult(row: WebMobillsImportReadyRow): MobillsImportRowResult | undefined {
    const duplicateOfTransactionId = this.fingerprints.get(row.fingerprint);
    if (!duplicateOfTransactionId || this.policy.duplicatePolicy === 'import_anyway') {
      return undefined;
    }

    return {
      sourceLine: row.sourceLine,
      status: this.policy.duplicatePolicy === 'fail' ? 'failed' : 'skipped',
      errorCode: 'DUPLICATE_TRANSACTION',
      errorMessage: `Duplicate transaction detected (existing transactionId=${duplicateOfTransactionId})`,
    };
  }

  remember(row: WebMobillsImportReadyRow, transactionId: string) {
    if (!this.fingerprints.has(row.fingerprint)) {
      this.fingerprints.set(row.fingerprint, transactionId);
    }
  }
}
