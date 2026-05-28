import type { LedgerPort } from '../../ledger/application/ledger.port';
import type { TaxonomyPort } from '../../taxonomy/application/taxonomy.port';
import type {
  MovementsBackupExport,
  MovementsBackupExportResult,
} from '../application/imports.port';

type WebMovementsBackupSource = Pick<
  LedgerPort & TaxonomyPort,
  'ledgerListAccounts' | 'ledgerListTransactions' | 'taxonomyListCategories' | 'taxonomyListTags'
>;

export async function collectWebMovementsBackupExport(
  source: WebMovementsBackupSource,
  exportedAt: string,
): Promise<MovementsBackupExport> {
  const [accountsResult, categoriesResult, tagsResult] = await Promise.all([
    source.ledgerListAccounts(),
    source.taxonomyListCategories({ includeArchived: true }),
    source.taxonomyListTags({ includeArchived: true }),
  ]);

  const postedMovements: MovementsBackupExport['postedMovements'] = [];
  for (const account of accountsResult.items) {
    let page = 0;
    while (true) {
      const result = await source.ledgerListTransactions({
        accountId: account.id,
        filters: {
          statuses: ['posted'],
        },
        pagination: {
          page,
          size: 100,
        },
        sort: [
          {
            field: 'occurredAt',
            direction: 'desc',
          },
        ],
      });

      postedMovements.push(
        ...result.content.map((transaction) => ({
          id: transaction.id,
          accountId: transaction.accountId,
          type: transaction.type,
          status: 'posted' as const,
          occurredAt: transaction.occurredAt,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          merchant: transaction.merchant,
          linkedTransactionId: transaction.linkedTransactionId,
          categoryId: transaction.categoryId,
          category: transaction.category,
          tagIds: (transaction.tags ?? []).map((tag) => tag.id),
          splitItems: transaction.items,
        })),
      );

      if (!result.hasNext || result.content.length === 0) {
        break;
      }
      page += 1;
    }
  }

  return {
    schemaVersion: 2,
    exportedAt,
    accounts: accountsResult.items,
    categories: categoriesResult.items,
    tags: tagsResult.items,
    postedMovements,
  };
}

export function webMovementsBackupFileName(exportedAt: string): string {
  return `gonezo-backup-${exportedAt.replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z')}.json`;
}

export function summarizeWebMovementsBackupExport(
  exportData: MovementsBackupExport,
  fileName: string,
): MovementsBackupExportResult {
  return {
    fileName,
    exportedAt: exportData.exportedAt,
    postedMovementCount: exportData.postedMovements.length,
    accountCount: exportData.accounts.length,
    categoryCount: exportData.categories.length,
    tagCount: exportData.tags.length,
  };
}
