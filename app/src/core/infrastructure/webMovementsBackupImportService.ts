import type { MovementsBackupExport, MovementsBackupImportResult } from '../../imports/application/imports.port';
import { normalizeWebTaxonomyCategoryName, normalizeWebTaxonomyTagName } from '../../taxonomy/infrastructure/webTaxonomyNames';
import type { WebAppState } from './webAppState';
import { decodeBase64Utf8 } from './webApplicationBackupService';

export class WebMovementsBackupImportService {
  private readonly state: WebAppState;

  constructor(state: WebAppState) {
    this.state = state;
  }

  import(fileBase64: string): MovementsBackupImportResult {
    if (!fileBase64.trim()) throw new Error('fileBase64 is required');
    const exportData = parseBackup(fileBase64);
    const timestamp = exportData.exportedAt;
    this.state.ledgerAccounts = exportData.accounts.map((account) => ({ ...account, status: account.status === 'archived' ? 'archived' : 'active', createdAt: timestamp }));
    this.state.taxonomyCategories = exportData.categories.map((category) => ({ id: category.id, name: category.name, normalizedName: normalizeWebTaxonomyCategoryName(category.name), appliesTo: category.appliesTo, status: category.status === 'archived' ? 'archived' : 'active', createdAt: timestamp }));
    this.state.taxonomyTags = exportData.tags.map((tag) => ({ id: tag.id, name: tag.name, normalizedName: normalizeWebTaxonomyTagName(tag.name), status: tag.status === 'archived' ? 'archived' : 'active', createdAt: timestamp }));
    this.state.taxonomyTransactionTags = new Map(exportData.postedMovements.map((movement) => [movement.id, movement.tagIds.slice()] as const));
    this.state.ledgerTransactions = exportData.postedMovements.map((movement) => ({ id: movement.id, accountId: movement.accountId, type: movement.type, status: movement.status, amount: movement.amount, currency: movement.currency, occurredAt: movement.occurredAt, description: movement.description, merchant: movement.merchant, categoryId: movement.categoryId, linkedTransactionId: movement.linkedTransactionId, items: movement.splitItems.map((item) => ({ ...item })) }));
    this.state.analyticsExclusions = [];
    this.state.recurringMovements = [];
    this.state.recurringMovementOccurrences = [];
    this.state.expectedMovements = [];
    this.state.sharingPersons = [];
    this.state.expenseShares = [];
    this.state.mobillsImportFingerprintToTransactionId = new Map();
    if (!this.state.defaultAccountId || !this.state.ledgerAccounts.some((account) => account.id === this.state.defaultAccountId)) {
      this.state.defaultAccountId = this.state.ledgerAccounts.find((account) => account.status === 'active')?.id ?? null;
    }
    return { totalRows: exportData.postedMovements.length, importedCount: exportData.postedMovements.length, failedCount: 0, skippedCount: 0, rows: exportData.postedMovements.map((movement, index) => ({ sourceLine: index + 1, status: 'imported', transactionId: movement.id })) };
  }
}

function parseBackup(fileBase64: string): MovementsBackupExport {
  const exportData = JSON.parse(decodeBase64Utf8(fileBase64)) as MovementsBackupExport;
  if (exportData.schemaVersion !== 2) throw new Error(`Unsupported backup schema version: ${exportData.schemaVersion}`);
  return exportData;
}
