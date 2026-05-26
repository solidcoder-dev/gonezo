import type {
  MobillsImportInput,
  MobillsImportResult,
  MobillsImportRowResult,
} from '../../domain/corePort';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import {
  buildMobillsFingerprint,
  decodeMobillsImportBase64,
  detectDelimitedHeaderDelimiter,
  findMobillsHeaderIndex,
  parseMobillsDate,
  parseMobillsTransferDescriptor,
  parseMobillsValue,
  splitDelimitedLine,
} from './coreAdapterWebMobillsImportParser';
import type { WebCoreState } from './coreAdapterWebState';
import type { WebTaxonomyService } from './coreAdapterWebTaxonomyService';

export type WebMobillsImportWorkflowOptions = {
  state: WebCoreState;
  ledger: WebLedgerService;
  taxonomy: WebTaxonomyService;
};

export class WebMobillsImportWorkflow {
  private readonly state: WebCoreState;

  private readonly ledger: WebLedgerService;

  private readonly taxonomy: WebTaxonomyService;

  constructor(options: WebMobillsImportWorkflowOptions) {
    this.state = options.state;
    this.ledger = options.ledger;
    this.taxonomy = options.taxonomy;
  }

  async import(input: MobillsImportInput): Promise<MobillsImportResult> {
    const policy = {
      createMissingAccounts: input.policy?.createMissingAccounts === true,
      createMissingCategories: input.policy?.createMissingCategories !== false,
      createMissingTags: input.policy?.createMissingTags !== false,
      duplicatePolicy: input.policy?.duplicatePolicy ?? 'skip',
    };

    const content = decodeMobillsImportBase64(input.fileBase64);
    const lines = content
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        totalRows: 0,
        importedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        rows: [],
      };
    }

    const delimiter = detectDelimitedHeaderDelimiter(lines[0]);
    const header = splitDelimitedLine(lines[0], delimiter);
    const dateIndex = findMobillsHeaderIndex(header, ['date', 'fecha']);
    const accountIndex = findMobillsHeaderIndex(header, ['account', 'cuenta']);
    const valueIndex = findMobillsHeaderIndex(header, ['value', 'amount', 'valor', 'importe']);
    if (dateIndex < 0 || accountIndex < 0 || valueIndex < 0) {
      throw new Error('Missing required columns: date/account/value');
    }
    const currencyIndex = findMobillsHeaderIndex(header, ['currency', 'moneda']);
    const descriptionIndex = findMobillsHeaderIndex(header, ['description', 'descripcion', 'concept', 'note']);
    const merchantIndex = findMobillsHeaderIndex(header, ['merchant', 'counterparty', 'store', 'payee', 'comercio']);
    const categoryIndex = findMobillsHeaderIndex(header, ['category', 'categoria']);
    const tagsIndex = findMobillsHeaderIndex(header, ['tags', 'etiquetas', 'tag']);

    const rows: MobillsImportRowResult[] = [];
    for (let index = 1; index < lines.length; index += 1) {
      const sourceLine = index + 1;
      const cells = splitDelimitedLine(lines[index], delimiter);
      const accountName = (cells[accountIndex] ?? '').trim();
      const occurredAt = parseMobillsDate(cells[dateIndex] ?? '');
      const rawValue = parseMobillsValue(cells[valueIndex] ?? '');

      if (!accountName) {
        rows.push({
          sourceLine,
          status: 'failed',
          errorCode: 'MISSING_ACCOUNT',
          errorMessage: `Account is required at line ${sourceLine}`,
        });
        continue;
      }
      if (!occurredAt) {
        rows.push({
          sourceLine,
          status: 'failed',
          errorCode: 'INVALID_DATE',
          errorMessage: `Cannot parse date at line ${sourceLine}`,
        });
        continue;
      }
      if (rawValue == null) {
        rows.push({
          sourceLine,
          status: 'failed',
          errorCode: 'INVALID_VALUE',
          errorMessage: `Cannot parse value at line ${sourceLine}`,
        });
        continue;
      }
      if (rawValue === 0) {
        rows.push({
          sourceLine,
          status: 'failed',
          errorCode: 'ZERO_VALUE',
          errorMessage: `Value cannot be zero at line ${sourceLine}`,
        });
        continue;
      }

      const currency = (cells[currencyIndex] ?? '').trim().toUpperCase() || 'EUR';
      const description = (cells[descriptionIndex] ?? '').trim() || undefined;
      const merchant = (cells[merchantIndex] ?? '').trim() || undefined;
      const categoryName = (cells[categoryIndex] ?? '').trim();
      const tagNames = (cells[tagsIndex] ?? '')
        .split(/[|,;]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const transferDescriptor = parseMobillsTransferDescriptor({
        description,
        rowAccountName: accountName,
        rawValue,
      });
      if (transferDescriptor && rawValue > 0) {
        rows.push({
          sourceLine,
          status: 'skipped',
          errorCode: 'TRANSFER_PAIR_ROW',
          errorMessage: `Mirrored transfer row skipped at line ${sourceLine}`,
        });
        continue;
      }

      const fingerprint = buildMobillsFingerprint({
        accountName,
        occurredAt,
        rawValue,
        currency,
        description,
        merchant,
      });
      const duplicateOfTransactionId = this.state.mobillsImportFingerprintToTransactionId.get(fingerprint);
      if (duplicateOfTransactionId && policy.duplicatePolicy !== 'import_anyway') {
        rows.push({
          sourceLine,
          status: policy.duplicatePolicy === 'fail' ? 'failed' : 'skipped',
          errorCode: 'DUPLICATE_TRANSACTION',
          errorMessage: `Duplicate transaction detected (existing transactionId=${duplicateOfTransactionId})`,
        });
        continue;
      }

      try {
        let transactionId: string;
        if (transferDescriptor && rawValue < 0) {
          const fromAccount = await this.ledger.resolveImportAccount(
            transferDescriptor.outAccountName,
            currency,
            policy.createMissingAccounts,
          );
          const toAccount = await this.ledger.resolveImportAccount(
            transferDescriptor.inAccountName,
            currency,
            policy.createMissingAccounts,
          );
          const amount = Math.abs(rawValue).toFixed(2);
          const transfer = await this.ledger.recordTransfer({
            fromAccountId: fromAccount.id,
            toAccountId: toAccount.id,
            occurredAt,
            amount,
            currency,
            description,
          });
          transactionId = transfer.transferOutId;

          if (tagNames.length > 0) {
            if (!policy.createMissingTags) {
              throw new Error('TAG_AUTOCREATE_DISABLED');
            }
            const outTagging = await this.taxonomy.applyTransactionTags({
              transactionId: transfer.transferOutId,
              tagNames,
            });
            if (outTagging.status === 'failed') {
              throw new Error(outTagging.errorCode ?? outTagging.errorMessage ?? 'Tag assignment failed');
            }
            const inTagging = await this.taxonomy.applyTransactionTags({
              transactionId: transfer.transferInId,
              tagNames,
            });
            if (inTagging.status === 'failed') {
              throw new Error(inTagging.errorCode ?? inTagging.errorMessage ?? 'Tag assignment failed');
            }
          }
        } else {
          const account = await this.ledger.resolveImportAccount(accountName, currency, policy.createMissingAccounts);
          const amount = Math.abs(rawValue).toFixed(2);
          transactionId = rawValue < 0
            ? (await this.ledger.recordExpense({
              accountId: account.id,
              occurredAt,
              amount,
              currency,
              description,
              merchant,
            })).id
            : (await this.ledger.recordIncome({
              accountId: account.id,
              occurredAt,
              amount,
              currency,
              description,
              merchant,
            })).id;

          if (categoryName) {
            const transactionType = rawValue < 0 ? 'expense' : 'income';
            let category = this.taxonomy.findActiveCategoryByName(categoryName, transactionType);
            if (!category) {
              if (!policy.createMissingCategories) {
                throw new Error('CATEGORY_AUTOCREATE_DISABLED');
              }
              const created = await this.taxonomy.createCategory({
                name: categoryName,
                appliesTo: transactionType,
              });
              category = this.taxonomy.findCategoryById(created.id);
            }
            if (!category) {
              throw new Error(`Category not found: ${categoryName}`);
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

          if (tagNames.length > 0) {
            if (!policy.createMissingTags) {
              throw new Error('TAG_AUTOCREATE_DISABLED');
            }
            const tagging = await this.taxonomy.applyTransactionTags({
              transactionId,
              tagNames,
            });
            if (tagging.status === 'failed') {
              throw new Error(tagging.errorCode ?? tagging.errorMessage ?? 'Tag assignment failed');
            }
          }
        }

        rows.push({
          sourceLine,
          status: 'imported',
          transactionId,
        });
        if (!this.state.mobillsImportFingerprintToTransactionId.has(fingerprint)) {
          this.state.mobillsImportFingerprintToTransactionId.set(fingerprint, transactionId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed';
        rows.push({
          sourceLine,
          status: 'failed',
          errorCode: message
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, ''),
          errorMessage: message,
        });
      }
    }

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
}
