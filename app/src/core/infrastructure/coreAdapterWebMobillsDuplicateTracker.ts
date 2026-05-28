import type { MobillsImportRowResult } from '../../imports/application/importsCore.port';
import type { WebCoreState } from './coreAdapterWebState';
import type { WebMobillsImportPolicy } from './coreAdapterWebMobillsImportPolicy';
import type { WebMobillsImportReadyRow } from './coreAdapterWebMobillsImportRows';

export class WebMobillsDuplicateTracker {
  private readonly fingerprints: WebCoreState['mobillsImportFingerprintToTransactionId'];

  private readonly policy: WebMobillsImportPolicy;

  constructor(
    fingerprints: WebCoreState['mobillsImportFingerprintToTransactionId'],
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
