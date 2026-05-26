import { describe, expect, it } from 'vitest';
import { WebMobillsDuplicateTracker } from './coreAdapterWebMobillsDuplicateTracker';
import { normalizeWebMobillsImportPolicy } from './coreAdapterWebMobillsImportPolicy';
import { readWebMobillsImportRows } from './coreAdapterWebMobillsImportRows';
import { createWebCoreState } from './coreAdapterWebState';

function toUtf16Base64(text: string): string {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    bytes.push(code & 0xff);
    bytes.push((code >> 8) & 0xff);
  }
  return btoa(String.fromCharCode(...bytes));
}

describe('coreAdapterWebMobillsImport parts', () => {
  it('normalizes import policy defaults and explicit flags', () => {
    expect(normalizeWebMobillsImportPolicy()).toEqual({
      createMissingAccounts: false,
      createMissingCategories: true,
      createMissingTags: true,
      duplicatePolicy: 'skip',
    });

    expect(normalizeWebMobillsImportPolicy({
      createMissingAccounts: true,
      createMissingCategories: false,
      createMissingTags: false,
      duplicatePolicy: 'fail',
    })).toEqual({
      createMissingAccounts: true,
      createMissingCategories: false,
      createMissingTags: false,
      duplicatePolicy: 'fail',
    });
  });

  it('reads Mobills rows into ready, failed and mirrored-transfer results', () => {
    const csv = [
      '"Date";"Description";"Value";"Account";"Category";"Tags"',
      '"01/06/2024";"Transfer BBVA Trade republic";"-100";"BBVA";"Transferencia";"invest"',
      '"01/06/2024";"Transfer BBVA Trade republic";"100";"Trade republic";"Transferencia";"invest"',
      '"bad date";"Lunch";"-8.30";"Cash";"Food";"trip"',
      '"01/06/2024";"Broken";"0";"Cash";"Food";""',
    ].join('\r\n');

    const parsed = readWebMobillsImportRows(toUtf16Base64(csv));

    expect(parsed.rows).toHaveLength(4);
    expect(parsed.rows[0]).toMatchObject({
      status: 'ready',
      sourceLine: 2,
      accountName: 'BBVA',
      rawValue: -100,
      currency: 'EUR',
      tagNames: ['invest'],
      transferDescriptor: {
        outAccountName: 'BBVA',
        inAccountName: 'Trade republic',
      },
    });
    expect(parsed.rows[1]).toMatchObject({
      status: 'skipped',
      result: {
        sourceLine: 3,
        status: 'skipped',
        errorCode: 'TRANSFER_PAIR_ROW',
      },
    });
    expect(parsed.rows[2]).toMatchObject({
      status: 'failed',
      result: {
        sourceLine: 4,
        status: 'failed',
        errorCode: 'INVALID_DATE',
      },
    });
    expect(parsed.rows[3]).toMatchObject({
      status: 'failed',
      result: {
        sourceLine: 5,
        status: 'failed',
        errorCode: 'ZERO_VALUE',
      },
    });
  });

  it('encapsulates duplicate policy decisions and keeps the first remembered transaction id', () => {
    const csv = [
      'date,account,value,currency,description,merchant,category,tags',
      '2026-03-20,Cash,-12.50,EUR,Lunch,Cafe,Food,trip',
    ].join('\r\n');
    const row = readWebMobillsImportRows(toUtf16Base64(csv)).rows[0];
    if (row?.status !== 'ready') {
      throw new Error('Expected a ready row');
    }
    const state = createWebCoreState();
    const skipTracker = new WebMobillsDuplicateTracker(
      state.mobillsImportFingerprintToTransactionId,
      normalizeWebMobillsImportPolicy(),
    );

    expect(skipTracker.duplicateResult(row)).toBeUndefined();
    skipTracker.remember(row, 'tx-1');
    skipTracker.remember(row, 'tx-2');
    expect(state.mobillsImportFingerprintToTransactionId.get(row.fingerprint)).toBe('tx-1');
    expect(skipTracker.duplicateResult(row)).toEqual({
      sourceLine: 2,
      status: 'skipped',
      errorCode: 'DUPLICATE_TRANSACTION',
      errorMessage: 'Duplicate transaction detected (existing transactionId=tx-1)',
    });

    const failTracker = new WebMobillsDuplicateTracker(
      state.mobillsImportFingerprintToTransactionId,
      normalizeWebMobillsImportPolicy({ duplicatePolicy: 'fail' }),
    );
    expect(failTracker.duplicateResult(row)).toMatchObject({
      status: 'failed',
      errorCode: 'DUPLICATE_TRANSACTION',
    });

    const importAnywayTracker = new WebMobillsDuplicateTracker(
      state.mobillsImportFingerprintToTransactionId,
      normalizeWebMobillsImportPolicy({ duplicatePolicy: 'import_anyway' }),
    );
    expect(importAnywayTracker.duplicateResult(row)).toBeUndefined();
  });
});
