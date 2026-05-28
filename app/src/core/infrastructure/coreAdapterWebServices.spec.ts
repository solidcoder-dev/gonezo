import { describe, expect, it, vi } from 'vitest';
import type { CoreAdapterWebDependencies } from './coreAdapterWebEffects';
import { WebLedgerService } from '../../ledger/infrastructure/coreAdapterWebLedgerService';
import { WebMobillsImportWorkflow } from '../../imports/infrastructure/providers/mobills/coreAdapterWebMobillsImportWorkflow';
import { createWebCoreState } from './coreAdapterWebState';
import { WebTaxonomyService } from '../../taxonomy/infrastructure/coreAdapterWebTaxonomyService';

function toUtf16Base64(text: string): string {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    bytes.push(code & 0xff);
    bytes.push((code >> 8) & 0xff);
  }
  return btoa(String.fromCharCode(...bytes));
}

function createDependencies(): CoreAdapterWebDependencies {
  let next = 0;
  return {
    clock: {
      nowIso: () => '2026-05-26T09:00:00.000Z',
    },
    idGenerator: {
      nextId: () => {
        next += 1;
        return `id-${next}`;
      },
    },
    backupDownloader: {
      downloadJson: vi.fn(),
    },
  };
}

describe('coreAdapterWeb service composition', () => {
  it('runs Mobills import through ledger and taxonomy services without depending on the adapter facade', async () => {
    const state = createWebCoreState();
    const dependencies = createDependencies();
    const ledger = new WebLedgerService({ state, dependencies });
    const taxonomy = new WebTaxonomyService({ state, dependencies });
    const workflow = new WebMobillsImportWorkflow({ state, ledger, taxonomy });
    const csv = [
      'date,account,value,currency,description,merchant,category,tags',
      '2026-03-20,Cash,-12.50,EUR,Lunch,Cafe,Food,"trip,Trip"',
    ].join('\r\n');

    const result = await workflow.import({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
      },
    });

    expect(result).toMatchObject({
      totalRows: 1,
      importedCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });

    const accounts = await ledger.listAccounts();
    expect(accounts.items).toMatchObject([
      {
        id: 'id-1',
        name: 'Cash',
        currency: 'EUR',
        status: 'active',
      },
    ]);

    const transactions = await ledger.listTransactions({
      accountId: 'id-1',
      filters: { statuses: ['posted'] },
      pagination: { page: 0, size: 10 },
    });
    expect(transactions.content).toHaveLength(1);
    expect(transactions.content[0]).toMatchObject({
      id: 'id-2',
      type: 'expense',
      amount: '12.50',
      categoryId: 'id-3',
    });

    const assignedTaxonomy = await taxonomy.listTransactionTaxonomy({
      transactionIds: ['id-2'],
    });
    expect(assignedTaxonomy.items).toEqual([
      {
        transactionId: 'id-2',
        categoryId: 'id-3',
        tagIds: ['id-4'],
        categorizationStatus: 'assigned',
        taggingStatus: 'assigned',
      },
    ]);
  });
});
