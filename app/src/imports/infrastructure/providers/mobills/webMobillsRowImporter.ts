import type {
  MobillsLedgerPort,
  MobillsTaxonomyPort,
} from '../../../application/mobillsImportPorts';
import type { WebMobillsImportPolicy } from './webMobillsImportPolicy';
import type { WebMobillsImportReadyRow } from './webMobillsImportRows';

export type WebMobillsRowImporterOptions = {
  ledger: MobillsLedgerPort;
  taxonomy: MobillsTaxonomyPort;
};

export class WebMobillsRowImporter {
  private readonly ledger: MobillsLedgerPort;

  private readonly taxonomy: MobillsTaxonomyPort;

  constructor(options: WebMobillsRowImporterOptions) {
    this.ledger = options.ledger;
    this.taxonomy = options.taxonomy;
  }

  async importRow(
    row: WebMobillsImportReadyRow,
    policy: WebMobillsImportPolicy,
  ): Promise<string> {
    if (row.transferDescriptor && row.rawValue < 0) {
      return this.importTransferRow(row, policy);
    }
    return this.importStandardRow(row, policy);
  }

  private async importTransferRow(
    row: WebMobillsImportReadyRow,
    policy: WebMobillsImportPolicy,
  ): Promise<string> {
    if (!row.transferDescriptor) {
      throw new Error('Transfer descriptor is required');
    }
    const fromAccount = await this.ledger.resolveImportAccount(
      row.transferDescriptor.outAccountName,
      row.currency,
      policy.createMissingAccounts,
    );
    const toAccount = await this.ledger.resolveImportAccount(
      row.transferDescriptor.inAccountName,
      row.currency,
      policy.createMissingAccounts,
    );
    const amount = Math.abs(row.rawValue).toFixed(2);
    const transfer = await this.ledger.recordTransfer({
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      occurredAt: row.occurredAt,
      amount,
      currency: row.currency,
      description: row.description,
    });

    if (row.tagNames.length > 0) {
      if (!policy.createMissingTags) {
        throw new Error('TAG_AUTOCREATE_DISABLED');
      }
      await this.assignTagsOrThrow(transfer.transferOutId, row.tagNames);
      await this.assignTagsOrThrow(transfer.transferInId, row.tagNames);
    }

    return transfer.transferOutId;
  }

  private async importStandardRow(
    row: WebMobillsImportReadyRow,
    policy: WebMobillsImportPolicy,
  ): Promise<string> {
    const account = await this.ledger.resolveImportAccount(
      row.accountName,
      row.currency,
      policy.createMissingAccounts,
    );
    const amount = Math.abs(row.rawValue).toFixed(2);
    const transactionId = row.rawValue < 0
      ? (await this.ledger.recordExpense({
        accountId: account.id,
        occurredAt: row.occurredAt,
        amount,
        currency: row.currency,
        description: row.description,
        merchant: row.merchant,
      })).id
      : (await this.ledger.recordIncome({
        accountId: account.id,
        occurredAt: row.occurredAt,
        amount,
        currency: row.currency,
        description: row.description,
        merchant: row.merchant,
      })).id;

    if (row.categoryName) {
      await this.assignCategoryOrThrow(transactionId, row, policy);
    }

    if (row.tagNames.length > 0) {
      if (!policy.createMissingTags) {
        throw new Error('TAG_AUTOCREATE_DISABLED');
      }
      await this.assignTagsOrThrow(transactionId, row.tagNames);
    }

    return transactionId;
  }

  private async assignCategoryOrThrow(
    transactionId: string,
    row: WebMobillsImportReadyRow,
    policy: WebMobillsImportPolicy,
  ) {
    const transactionType = row.rawValue < 0 ? 'expense' : 'income';
    const category = this.taxonomy.findActiveCategoryByName(row.categoryName, transactionType)
      ?? this.taxonomy.findActiveCategoryByName('Other', transactionType);
    if (!category) {
      throw new Error(policy.createMissingCategories ? 'CATEGORY_MASTER_FALLBACK_NOT_FOUND' : 'CATEGORY_AUTOCREATE_DISABLED');
    }
    const categorized = await this.taxonomy.categorizeTransaction({
      transactionId,
      transactionType,
      categoryId: category.id,
    });
    if (categorized.status === 'failed') {
      throw new Error(categorized.errorCode ?? categorized.errorMessage ?? 'Categorization failed');
    }
  }

  private async assignTagsOrThrow(transactionId: string, tagNames: string[]) {
    const tagging = await this.taxonomy.applyTransactionTags({
      transactionId,
      tagNames,
    });
    if (tagging.status === 'failed') {
      throw new Error(tagging.errorCode ?? tagging.errorMessage ?? 'Tag assignment failed');
    }
  }
}
