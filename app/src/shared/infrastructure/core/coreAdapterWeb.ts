import type {
  CorePort,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerRestoreAccountInput,
  LedgerDeleteAccountInput,
  UserPreferencesResult,
  PreferencesSetDefaultAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerAddTransactionItemInput,
  LedgerPostDraftTransactionInput,
  LedgerVoidTransactionInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyRenameCategoryInput,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  TaxonomyRenameTagInput,
  MobillsImportInput,
  MobillsImportResult,
  MobillsImportRowResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  MovementsBackupExportResult,
  MovementsBackupImportInput,
  MovementsBackupImportResult,
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  SchedulingUpdateMovementInput,
  SchedulingUpdateMovementResult,
  SchedulingMovementItem,
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  LedgerTransactionListItem,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';
import { resolveSchedulingKind } from '../../domain/schedulingKind';
import {
  defaultCoreAdapterWebDependencies,
  type CoreAdapterWebDependencies,
} from './coreAdapterWebEffects';
import {
  collectWebMovementsBackupExport,
  summarizeWebMovementsBackupExport,
  webMovementsBackupFileName,
} from './coreAdapterWebBackup';
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
import { listWebLedgerTransactions } from './coreAdapterWebLedgerQueries';
import {
  compareScheduledMovementByDue,
  filterExpectedMovements,
  filterScheduledMovements,
  isScheduledMovementVisibleForAccount,
  mapExpectedMovementToSearchItem,
  mapPostedTransactionToSearchItem,
  mapScheduledMovementToSearchItem,
} from './coreAdapterWebMovementQueries';
import {
  firstDueAtForWebRecurrence,
  normalizeWebRecurrenceEnd,
  normalizeWebRecurrenceRule,
} from './coreAdapterWebRecurrence';
import {
  defaultWebCoreState,
  type WebCoreState,
  type WebLedgerAccount,
  type WebLedgerTransaction,
  type WebRecurringMovement,
} from './coreAdapterWebState';
import { getMovementsSearchFacets } from './movementsSearchFacets';

export type CoreAdapterWebOptions = {
  state?: WebCoreState;
  dependencies?: Partial<CoreAdapterWebDependencies>;
};

export class CoreAdapterWeb implements CorePort {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

  constructor(options: CoreAdapterWebOptions = {}) {
    this.state = options.state ?? defaultWebCoreState;
    this.dependencies = {
      clock: options.dependencies?.clock ?? defaultCoreAdapterWebDependencies.clock,
      idGenerator: options.dependencies?.idGenerator ?? defaultCoreAdapterWebDependencies.idGenerator,
      backupDownloader: options.dependencies?.backupDownloader ?? defaultCoreAdapterWebDependencies.backupDownloader,
    };
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  private accountOrThrow(accountId: string): WebLedgerAccount {
    const account = this.state.ledgerAccounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  async preferencesGet(): Promise<UserPreferencesResult> {
    return { defaultAccountId: this.state.defaultAccountId };
  }

  async preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void> {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.state.defaultAccountId = accountId;
  }

  async preferencesClearDefaultAccount(): Promise<void> {
    this.state.defaultAccountId = null;
  }

  private transactionOrThrow(transactionId: string): WebLedgerTransaction {
    const transaction = this.state.ledgerTransactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  private categoryNameById(categoryId?: string): string | undefined {
    if (!categoryId) {
      return undefined;
    }
    return this.state.taxonomyCategories.find((category) => category.id === categoryId)?.name;
  }

  private normalizeCategoryName(name: string): string {
    return name.trim().toLowerCase();
  }

  private normalizeTagName(name: string): string {
    return name.trim().toLowerCase();
  }

  private ensureAccountCanPost(account: WebLedgerAccount, currency: string) {
    if (account.status !== 'active') {
      throw new Error('Archived accounts cannot accept transactions');
    }
    if (account.currency !== currency.toUpperCase()) {
      throw new Error(`Transaction currency must match account currency (${account.currency})`);
    }
  }

  private netForAccount(accountId: string): number {
    let net = 0;
    for (const tx of this.state.ledgerTransactions) {
      if (tx.accountId !== accountId || tx.status !== 'posted') {
        continue;
      }
      const amount = Number(tx.amount);
      if (Number.isNaN(amount)) {
        continue;
      }
      if (tx.type === 'income') {
        net += amount;
      }
      if (tx.type === 'expense') {
        net -= amount;
      }
      if (tx.type === 'transfer_in') {
        net += amount;
      }
      if (tx.type === 'transfer_out') {
        net -= amount;
      }
    }
    return net;
  }

  private async resolveImportAccount(
    accountName: string,
    currency: string,
    createMissingAccounts: boolean,
  ): Promise<WebLedgerAccount> {
    const normalizedName = accountName.trim();
    let account = this.state.ledgerAccounts.find(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase() && item.currency === currency,
    );
    if (!account) {
      if (!createMissingAccounts) {
        throw new Error(`ACCOUNT_NOT_FOUND:${normalizedName}:${currency}`);
      }
      const opened = await this.ledgerOpenAccount({
        name: normalizedName,
        type: 'cash',
        currency,
      });
      account = this.state.ledgerAccounts.find((item) => item.id === opened.id);
    }
    if (!account) {
      throw new Error(`Account not found: ${normalizedName}`);
    }
    return account;
  }

  async ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    const id = this.nextId();
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    const currency = input.currency.toUpperCase();
    if (!this.state.supportedCurrencies.includes(currency)) {
      throw new Error(`unsupported currency code: ${currency}`);
    }
    const openingBalanceRaw = input.openingBalanceAmount?.trim();
    const openingBalance = openingBalanceRaw ? Number(openingBalanceRaw) : 0;
    if (Number.isNaN(openingBalance)) {
      throw new Error('opening balance must be a valid number');
    }

    this.state.ledgerAccounts.push({
      id,
      name,
      type: (input.type ?? 'cash').toLowerCase(),
      currency,
      status: 'active',
      createdAt: input.createdAt ?? this.nowIso(),
    });
    if (openingBalance !== 0) {
      this.state.ledgerTransactions.push({
        id: this.nextId(),
        accountId: id,
        type: openingBalance > 0 ? 'income' : 'expense',
        status: 'posted',
        amount: Math.abs(openingBalance).toFixed(2),
        currency,
        occurredAt: input.createdAt ?? this.nowIso(),
        description: 'Opening balance',
        items: [],
      });
    }
    return { id };
  }

  async ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return { items: [...this.state.supportedCurrencies] };
  }

  async ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void> {
    const account = this.accountOrThrow(input.accountId);
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    account.name = name;
  }

  async ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    const account = this.accountOrThrow(input.accountId);
    account.status = 'archived';
    account.archivedAt = input.archivedAt ?? this.nowIso();
  }

  async ledgerRestoreAccount(input: LedgerRestoreAccountInput): Promise<void> {
    const account = this.accountOrThrow(input.accountId);
    account.status = 'active';
    account.archivedAt = undefined;
  }

  async ledgerDeleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.accountOrThrow(accountId);

    const deletedTransactionIds = new Set(
      this.state.ledgerTransactions
        .filter((tx) => tx.accountId === accountId)
        .map((tx) => tx.id),
    );

    this.state.ledgerTransactions = this.state.ledgerTransactions
      .filter((tx) => tx.accountId !== accountId);
    this.state.ledgerAccounts = this.state.ledgerAccounts
      .filter((account) => account.id !== accountId);

    for (const transactionId of deletedTransactionIds) {
      this.state.taxonomyTransactionTags.delete(transactionId);
    }
    if (deletedTransactionIds.size > 0) {
      this.state.mobillsImportFingerprintToTransactionId = new Map(
        [...this.state.mobillsImportFingerprintToTransactionId.entries()]
          .filter(([, transactionId]) => !deletedTransactionIds.has(transactionId)),
      );
    }
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return {
      items: this.state.ledgerAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        status: account.status,
      })),
    };
  }

  async ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    const account = this.accountOrThrow(input.accountId);
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balanceAmount: this.netForAccount(account.id).toFixed(2),
    };
  }

  async ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'expense',
      status: 'posted',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'income',
      status: 'posted',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    const fromAccount = this.accountOrThrow(input.fromAccountId);
    const toAccount = this.accountOrThrow(input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    this.ensureAccountCanPost(fromAccount, input.currency);
    this.ensureAccountCanPost(toAccount, input.currency);

    const transferOutId = this.nextId();
    const transferInId = this.nextId();
    const currency = input.currency.toUpperCase();

    this.state.ledgerTransactions.push({
      id: transferOutId,
      accountId: fromAccount.id,
      type: 'transfer_out',
      status: 'posted',
      amount: input.amount,
      currency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferInId,
      items: [],
    });
    this.state.ledgerTransactions.push({
      id: transferInId,
      accountId: toAccount.id,
      type: 'transfer_in',
      status: 'posted',
      amount: input.amount,
      currency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferOutId,
      items: [],
    });

    return {
      transferOutId,
      transferInId,
    };
  }

  async ledgerRecordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    const fromAccount = this.accountOrThrow(input.fromAccountId);
    const toAccount = this.accountOrThrow(input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    this.ensureAccountCanPost(fromAccount, input.sourceCurrency);
    this.ensureAccountCanPost(toAccount, input.destinationCurrency);

    const sourceAmount = Number(input.sourceAmount);
    const destinationAmount = Number(input.destinationAmount);
    if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
      throw new Error('source amount must be greater than 0');
    }
    if (!Number.isFinite(destinationAmount) || destinationAmount <= 0) {
      throw new Error('destination amount must be greater than 0');
    }

    const sourceCurrency = input.sourceCurrency.toUpperCase();
    const destinationCurrency = input.destinationCurrency.toUpperCase();

    const resolvedExchangeRate = input.exchangeRate == null || input.exchangeRate.trim().length === 0
      ? destinationAmount / sourceAmount
      : Number(input.exchangeRate);
    if (!Number.isFinite(resolvedExchangeRate) || resolvedExchangeRate <= 0) {
      throw new Error('exchange rate must be greater than 0');
    }

    const normalizedSourceAmount = Number(sourceAmount.toFixed(2));
    const normalizedDestinationAmount = Number(destinationAmount.toFixed(2));

    if (sourceCurrency === destinationCurrency) {
      if (Math.abs(normalizedSourceAmount - normalizedDestinationAmount) > 0.000001) {
        throw new Error('Same-currency transfer must keep equal source and destination amounts');
      }
      if (input.exchangeRate != null && input.exchangeRate.trim().length > 0 && Math.abs(resolvedExchangeRate - 1) > 0.000001) {
        throw new Error('Same-currency transfer exchange rate must be 1');
      }
    } else {
      const expectedDestinationAmount = Number((normalizedSourceAmount * resolvedExchangeRate).toFixed(2));
      if (Math.abs(expectedDestinationAmount - normalizedDestinationAmount) > 0.000001) {
        throw new Error('Transfer amounts do not match exchange rate');
      }
    }

    const transferOutId = this.nextId();
    const transferInId = this.nextId();

    this.state.ledgerTransactions.push({
      id: transferOutId,
      accountId: fromAccount.id,
      type: 'transfer_out',
      status: 'posted',
      amount: normalizedSourceAmount.toFixed(2),
      currency: sourceCurrency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferInId,
      items: [],
    });
    this.state.ledgerTransactions.push({
      id: transferInId,
      accountId: toAccount.id,
      type: 'transfer_in',
      status: 'posted',
      amount: normalizedDestinationAmount.toFixed(2),
      currency: destinationCurrency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferOutId,
      items: [],
    });

    return {
      transferOutId,
      transferInId,
    };
  }

  async ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: input.type ?? 'expense',
      status: 'draft',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    const tx = this.state.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'draft') {
      throw new Error('Items can only be modified in draft status');
    }
    if (tx.currency !== input.currency.toUpperCase()) {
      throw new Error('Item currency must match transaction currency');
    }
    tx.items.push({
      id: this.nextId(),
      name: input.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      categoryId: input.categoryId,
      note: input.note,
    });
  }

  async ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    const tx = this.state.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'draft') {
      throw new Error('Only draft transactions can be posted');
    }
    if (tx.items.length > 0) {
      const total = tx.items.reduce((acc, item) => acc + Number(item.amount), 0);
      if (Number(tx.amount).toFixed(2) !== total.toFixed(2)) {
        throw new Error('sum(items) must match transaction amount');
      }
    }
    tx.status = 'posted';
  }

  async ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    const tx = this.state.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'posted') {
      throw new Error('Only posted transactions can be voided');
    }
    tx.status = 'voided';
    if (tx.linkedTransactionId) {
      const linked = this.state.ledgerTransactions.find((item) => item.id === tx.linkedTransactionId);
      if (linked?.status === 'posted') {
        linked.status = 'voided';
      }
    }
  }

  async ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return listWebLedgerTransactions(
      input,
      this.state.ledgerTransactions,
      this.state.taxonomyTransactionTags,
    );
  }

  async taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    const includeArchived = input?.includeArchived === true;
    const items = this.state.taxonomyCategories
      .filter((category) => includeArchived || category.status !== 'archived')
      .filter((category) => !input?.appliesTo || category.appliesTo === input.appliesTo)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({
        id: category.id,
        name: category.name,
        appliesTo: category.appliesTo,
        status: category.status,
      }));

    return { items };
  }

  async taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Category name is required');
    }
    const normalizedName = this.normalizeCategoryName(name);
    const appliesTo = input.appliesTo;
    const existing = this.state.taxonomyCategories.find(
      (category) => category.normalizedName === normalizedName && category.appliesTo === appliesTo,
    );
    if (existing) {
      throw new Error(`Category already exists for ${appliesTo}: ${name}`);
    }

    const id = this.nextId();
    this.state.taxonomyCategories.push({
      id,
      name,
      normalizedName,
      appliesTo,
      status: 'active',
      createdAt: this.nowIso(),
    });
    return { id };
  }

  async taxonomyRenameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    const category = this.state.taxonomyCategories.find((item) => item.id === input.categoryId);
    if (!category) {
      throw new Error(`Category not found: ${input.categoryId}`);
    }
    const name = input.name.trim();
    if (!name) {
      throw new Error('Category name is required');
    }
    const normalizedName = this.normalizeCategoryName(name);
    const duplicate = this.state.taxonomyCategories.find(
      (item) => item.id !== category.id
        && item.normalizedName === normalizedName
        && item.appliesTo === category.appliesTo,
    );
    if (duplicate) {
      throw new Error(`Category already exists for ${category.appliesTo}: ${name}`);
    }
    category.name = name;
    category.normalizedName = normalizedName;
  }

  async taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    const includeArchived = input?.includeArchived === true;
    const items = this.state.taxonomyTags
      .filter((tag) => includeArchived || tag.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        status: tag.status,
      }));

    return { items };
  }

  async taxonomyRenameTag(input: TaxonomyRenameTagInput): Promise<void> {
    const tag = this.state.taxonomyTags.find((item) => item.id === input.tagId);
    if (!tag) {
      throw new Error(`Tag not found: ${input.tagId}`);
    }
    const name = input.name.trim();
    if (!name) {
      throw new Error('Tag name is required');
    }
    const normalizedName = this.normalizeTagName(name);
    const duplicate = this.state.taxonomyTags.find(
      (item) => item.id !== tag.id && item.normalizedName === normalizedName,
    );
    if (duplicate) {
      throw new Error(`Tag already exists: ${name}`);
    }
    tag.name = name;
    tag.normalizedName = normalizedName;
  }

  async mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult> {
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
          const fromAccount = await this.resolveImportAccount(
            transferDescriptor.outAccountName,
            currency,
            policy.createMissingAccounts,
          );
          const toAccount = await this.resolveImportAccount(
            transferDescriptor.inAccountName,
            currency,
            policy.createMissingAccounts,
          );
          const amount = Math.abs(rawValue).toFixed(2);
          const transfer = await this.ledgerRecordTransfer({
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
            const outTagging = await this.orchestrationApplyTransactionTags({
              transactionId: transfer.transferOutId,
              tagNames,
            });
            if (outTagging.status === 'failed') {
              throw new Error(outTagging.errorCode ?? outTagging.errorMessage ?? 'Tag assignment failed');
            }
            const inTagging = await this.orchestrationApplyTransactionTags({
              transactionId: transfer.transferInId,
              tagNames,
            });
            if (inTagging.status === 'failed') {
              throw new Error(inTagging.errorCode ?? inTagging.errorMessage ?? 'Tag assignment failed');
            }
          }
        } else {
          const account = await this.resolveImportAccount(accountName, currency, policy.createMissingAccounts);
          const amount = Math.abs(rawValue).toFixed(2);
          transactionId = rawValue < 0
            ? (await this.ledgerRecordExpense({
              accountId: account.id,
              occurredAt,
              amount,
              currency,
              description,
              merchant,
            })).id
            : (await this.ledgerRecordIncome({
              accountId: account.id,
              occurredAt,
              amount,
              currency,
              description,
              merchant,
            })).id;

          if (categoryName) {
            const transactionType = rawValue < 0 ? 'expense' : 'income';
            let category = this.state.taxonomyCategories.find(
              (item) =>
                item.status === 'active'
                && item.appliesTo === transactionType
                && item.normalizedName === this.normalizeCategoryName(categoryName),
            );
            if (!category) {
              if (!policy.createMissingCategories) {
                throw new Error('CATEGORY_AUTOCREATE_DISABLED');
              }
              const created = await this.taxonomyCreateCategory({
                name: categoryName,
                appliesTo: transactionType,
              });
              category = this.state.taxonomyCategories.find((item) => item.id === created.id);
            }
            if (!category) {
              throw new Error(`Category not found: ${categoryName}`);
            }
            const categorized = await this.orchestrationCategorizeTransaction({
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
            const tagging = await this.orchestrationApplyTransactionTags({
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

  async orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    const transaction = this.transactionOrThrow(input.transactionId);
    const normalizedType = input.transactionType.trim().toLowerCase();
    if (transaction.type !== normalizedType) {
      throw new Error(`Transaction ${transaction.id} type mismatch: expected ${transaction.type}, got ${normalizedType}`);
    }
    if (normalizedType !== 'expense' && normalizedType !== 'income') {
      throw new Error('Only income/expense transactions can be categorized');
    }

    if (!input.categoryId) {
      transaction.categoryId = undefined;
      return { status: 'none' };
    }

    const category = this.state.taxonomyCategories.find((item) => item.id === input.categoryId);
    if (!category) {
      return {
        status: 'failed',
        categoryId: input.categoryId,
        errorCode: 'CATEGORY_NOT_FOUND',
        errorMessage: `Category not found: ${input.categoryId}`,
      };
    }
    if (category.status !== 'active') {
      return {
        status: 'failed',
        categoryId: input.categoryId,
        errorCode: 'CATEGORY_ARCHIVED',
        errorMessage: 'Archived categories cannot be assigned',
      };
    }
    if (category.appliesTo !== normalizedType) {
      return {
        status: 'failed',
        categoryId: input.categoryId,
        errorCode: 'CATEGORY_APPLIES_TO_MISMATCH',
        errorMessage: `Category applies to ${category.appliesTo}, got ${normalizedType}`,
      };
    }

    transaction.categoryId = category.id;
    return { status: 'assigned', categoryId: category.id };
  }

  async orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    this.transactionOrThrow(input.transactionId);

    const uniqueByNormalizedName = new Map<string, string>();
    for (const rawName of input.tagNames) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      const normalizedName = this.normalizeTagName(name);
      if (!uniqueByNormalizedName.has(normalizedName)) {
        uniqueByNormalizedName.set(normalizedName, name);
      }
    }

    if (uniqueByNormalizedName.size === 0) {
      this.state.taxonomyTransactionTags.set(input.transactionId, []);
      return { status: 'none' };
    }

    const tagIds: string[] = [];
    for (const [normalizedName, originalName] of uniqueByNormalizedName) {
      const existing = this.state.taxonomyTags.find((tag) => tag.normalizedName === normalizedName);
      if (existing) {
        if (existing.status !== 'active') {
          return {
            status: 'failed',
            errorCode: 'TAG_ARCHIVED',
            errorMessage: `Tag is archived: ${existing.name}`,
          };
        }
        tagIds.push(existing.id);
        continue;
      }

      const id = this.nextId();
      this.state.taxonomyTags.push({
        id,
        name: originalName,
        normalizedName,
        status: 'active',
        createdAt: this.nowIso(),
      });
      tagIds.push(id);
    }

    this.state.taxonomyTransactionTags.set(input.transactionId, tagIds);
    return {
      status: 'assigned',
      tagIds: [...tagIds],
    };
  }

  async orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    const uniqueTransactionIds = [...new Set(input.transactionIds.map((id) => id.trim()).filter((id) => id.length > 0))];
    const items: OrchestrationListTransactionTaxonomyResult['items'] = uniqueTransactionIds.map((transactionId) => {
      const transaction = this.state.ledgerTransactions.find((item) => item.id === transactionId);
      const tagIds = this.state.taxonomyTransactionTags.get(transactionId) ?? [];
      const categoryId = transaction?.categoryId;
      return {
        transactionId,
        categoryId,
        tagIds: [...tagIds],
        categorizationStatus: categoryId ? 'assigned' : 'none',
        taggingStatus: tagIds.length > 0 ? 'assigned' : 'none',
      };
    });
    return { items };
  }

  async recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    const sourceAccount = this.accountOrThrow(input.sourceAccountId);
    if (sourceAccount.status !== 'active') {
      throw new Error('Source account is archived');
    }

    if (input.type === 'transfer') {
      if (!input.targetAccountId) {
        throw new Error('targetAccountId is required for transfer recurrence');
      }
      const targetAccount = this.accountOrThrow(input.targetAccountId);
      if (targetAccount.status !== 'active') {
        throw new Error('Target account is archived');
      }
      if (targetAccount.id === sourceAccount.id) {
        throw new Error('Source and target accounts must be different');
      }
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Recurring amount must be greater than 0');
    }
    const destinationAmount = input.destinationAmount == null ? undefined : Number(input.destinationAmount);
    if (destinationAmount != null && (!Number.isFinite(destinationAmount) || destinationAmount <= 0)) {
      throw new Error('Recurring destination amount must be greater than 0');
    }
    const normalizedRule = normalizeWebRecurrenceRule(input.rule);
    const normalizedEnd = normalizeWebRecurrenceEnd(input.recurrenceEnd);
    const nextDueAt = firstDueAtForWebRecurrence({
      startAt: input.startAt,
      zoneId: input.zoneId,
      rule: normalizedRule,
      recurrenceEnd: normalizedEnd,
    });
    const id = this.nextId();
    const movement: WebRecurringMovement = {
      id,
      type: input.type,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId?.trim() || undefined,
      amount: amount.toFixed(2),
      currency: input.currency.trim().toUpperCase(),
      destinationAmount: destinationAmount?.toFixed(2),
      destinationCurrency: input.destinationCurrency?.trim().toUpperCase() || undefined,
      exchangeRate: input.exchangeRate ? String(Number(input.exchangeRate)) : undefined,
      description: input.description?.trim() || undefined,
      merchant: input.merchant?.trim() || undefined,
      categoryId: input.categoryId?.trim() || undefined,
      tagIds: [...new Set((input.tagIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
      tagNames: [...new Set((input.tagNames ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      scheduleKind: 'recurring',
      origin: 'recurring',
      status: nextDueAt ? 'active' : 'completed',
      startAt: new Date(input.startAt).toISOString(),
      nextDueAt,
      zoneId: input.zoneId.trim(),
      generatedOccurrences: 0,
      rule: normalizedRule,
      recurrenceEnd: normalizedEnd,
      createdAt: this.nowIso(),
      completedAt: nextDueAt ? undefined : this.nowIso(),
    };
    this.state.recurringMovements.push(movement);
    return { id };
  }

  async recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void> {
    const movement = this.state.recurringMovements.find((item) => item.id === input.recurringMovementId);
    if (!movement) {
      throw new Error(`Recurring movement not found: ${input.recurringMovementId}`);
    }
    if (movement.status !== 'active') {
      return;
    }
    movement.status = 'deactivated';
    movement.nextDueAt = undefined;
    movement.deactivatedAt = input.deactivatedAt ? new Date(input.deactivatedAt).toISOString() : this.nowIso();
  }

  async recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult> {
    const items = this.state.recurringMovements
      .filter((movement) => isScheduledMovementVisibleForAccount(movement, input.sourceAccountId))
      .sort(compareScheduledMovementByDue)
      .map((movement) => ({ ...movement }));
    return { items };
  }

  async schedulingCreateMovement(
    input: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult> {
    const result = await this.recurrenceCreateRecurringMovement(input);
    if (input.scheduleKind === 'one_shot') {
      const movement = this.state.recurringMovements.find((item) => item.id === result.id);
      if (movement) {
        movement.scheduleKind = 'one_shot';
        movement.origin = 'one_shot';
      }
    }
    return result;
  }

  async schedulingUpdateMovement(
    input: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult> {
    const movement = this.state.recurringMovements.find((item) => item.id === input.recurringMovementId);
    if (!movement) {
      throw new Error(`Recurring movement not found: ${input.recurringMovementId}`);
    }
    if (movement.status !== 'active') {
      throw new Error('Only active scheduled movements can be edited');
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Recurring amount must be greater than 0');
    }

    const destinationAmount = input.destinationAmount == null ? undefined : Number(input.destinationAmount);
    if (destinationAmount != null && (!Number.isFinite(destinationAmount) || destinationAmount <= 0)) {
      throw new Error('Recurring destination amount must be greater than 0');
    }

    const normalizedRule = normalizeWebRecurrenceRule(input.rule);
    const normalizedEnd = normalizeWebRecurrenceEnd(input.recurrenceEnd);
    const nextDueAt = movement.generatedOccurrences === 0
      ? firstDueAtForWebRecurrence({
          startAt: input.startAt,
          zoneId: input.zoneId,
          rule: normalizedRule,
          recurrenceEnd: normalizedEnd,
        })
      : movement.nextDueAt;

    movement.type = input.type;
    movement.sourceAccountId = input.sourceAccountId;
    movement.targetAccountId = input.targetAccountId?.trim() || undefined;
    movement.amount = amount.toFixed(2);
    movement.currency = input.currency.trim().toUpperCase();
    movement.destinationAmount = destinationAmount?.toFixed(2);
    movement.destinationCurrency = input.destinationCurrency?.trim().toUpperCase() || undefined;
    movement.exchangeRate = input.exchangeRate ? String(Number(input.exchangeRate)) : undefined;
    movement.description = input.description?.trim() || undefined;
    movement.merchant = input.merchant?.trim() || undefined;
    movement.categoryId = input.categoryId?.trim() || undefined;
    movement.tagIds = [...new Set((input.tagIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))];
    movement.tagNames = [...new Set((input.tagNames ?? []).map((value) => value.trim()).filter((value) => value.length > 0))];
    movement.splitItems = (input.splitItems ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      amount: Number(item.amount).toFixed(2),
    }));
    movement.scheduleKind = input.scheduleKind ?? movement.scheduleKind ?? resolveSchedulingKind(movement);
    movement.origin = movement.scheduleKind;
    movement.rule = normalizedRule;
    movement.recurrenceEnd = normalizedEnd;
    movement.startAt = new Date(input.startAt).toISOString();
    movement.zoneId = input.zoneId.trim();
    movement.nextDueAt = nextDueAt;
    movement.deactivatedAt = undefined;
    movement.completedAt = nextDueAt ? undefined : this.nowIso();
    movement.status = nextDueAt ? 'active' : 'completed';

    return { id: movement.id };
  }

  async schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void> {
    await this.recurrenceDeactivateRecurringMovement(input);
  }

  async schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    const result = await this.recurrenceListRecurringMovements(input);
    return {
      items: result.items.map((item) => ({ ...item })) as SchedulingMovementItem[],
    };
  }

  async movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    const expectedPreviewSize = input.expectedPreviewSize != null && input.expectedPreviewSize > 0
      ? Math.min(Math.trunc(input.expectedPreviewSize), 20)
      : 5;
    const fromDate = input.fromDate ?? input.filters?.fromDate;
    const toDate = input.toDate ?? input.filters?.toDate;

    const scheduledFiltered = filterScheduledMovements(this.state.recurringMovements, {
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
      },
    });
    const expectedFiltered = filterExpectedMovements(this.state.expectedMovements, {
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
      },
    }).sort((left, right) => {
      const dateComparison = left.expectedAt.localeCompare(right.expectedAt);
      return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
    });

    const postedFilters = {
      fromDate,
      toDate,
      statuses: ['posted' as const],
    };
    const allPosted: LedgerTransactionListItem[] = [];
    let postedPageIndex = 0;
    let hasMorePosted = true;
    while (hasMorePosted) {
      const pageResult = await this.ledgerListTransactions({
        accountId: input.accountId,
        filters: postedFilters,
        pagination: {
          page: postedPageIndex,
          size: 100,
        },
        sort: [
          {
            field: 'occurredAt',
            direction: 'desc',
          },
        ],
      });
      allPosted.push(...pageResult.content);
      hasMorePosted = pageResult.hasNext;
      postedPageIndex += 1;
      if (!hasMorePosted || pageResult.content.length === 0) {
        break;
      }
    }

    const postedPage: LedgerListTransactionsResult = {
      content: allPosted,
      page: 0,
      size: allPosted.length,
      totalElements: allPosted.length,
      totalPages: allPosted.length === 0 ? 0 : 1,
      hasNext: false,
      hasPrevious: false,
    };

    return {
      scheduledPreview: {
        items: scheduledFiltered,
        total: scheduledFiltered.length,
        hasMore: false,
      },
      expectedPreview: {
        items: expectedFiltered.slice(0, expectedPreviewSize),
        total: expectedFiltered.length,
        hasMore: expectedFiltered.length > expectedPreviewSize,
      },
      postedPage,
      executedPage: postedPage,
    };
  }

  async movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.movementsGetMonthOverview(input);
  }

  async expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Expected movement amount must be greater than 0');
    }
    const expectedAt = input.expectedAt.trim() || this.nowIso();
    const now = this.nowIso();
    const id = this.nextId();
    this.state.expectedMovements.push({
      id,
      accountId: input.accountId,
      type: input.type,
      amount: amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      expectedAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      originOccurrenceId: undefined,
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  }

  async expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult> {
    const movementIndex = this.state.expectedMovements.findIndex((item) => item.id === input.expectedMovementId);
    if (movementIndex < 0) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    const current = this.state.expectedMovements[movementIndex];
    if (current.status !== 'pending') {
      throw new Error('Only pending expected movements can be changed');
    }
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Expected movement amount must be greater than 0');
    }
    const expectedAt = input.expectedAt.trim() || this.nowIso();
    const now = this.nowIso();
    this.state.expectedMovements[movementIndex] = {
      ...current,
      accountId: input.accountId,
      type: input.type,
      amount: amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      expectedAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      updatedAt: now,
    };
    return { id: current.id };
  }

  async expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    this.accountOrThrow(input.accountId);
    return {
      items: filterExpectedMovements(this.state.expectedMovements, {
        accountId: input.accountId,
        includeClosed: input.includeClosed === true,
      }),
    };
  }

  async expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void> {
    const movement = this.state.expectedMovements.find((item) => item.id === input.expectedMovementId);
    if (!movement) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    const transactionId = input.transactionId.trim();
    if (!transactionId) {
      throw new Error('transactionId is required');
    }
    movement.status = 'resolved';
    movement.resolvedTransactionId = transactionId;
    movement.resolvedAt = input.resolvedAt ?? this.nowIso();
    movement.updatedAt = movement.resolvedAt;
  }

  async expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void> {
    const movement = this.state.expectedMovements.find((item) => item.id === input.expectedMovementId);
    if (!movement) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    movement.status = 'dismissed';
    movement.dismissedAt = input.dismissedAt ?? this.nowIso();
    movement.updatedAt = movement.dismissedAt;
  }

  async movementsExportBackup(): Promise<MovementsBackupExportResult> {
    const exportData = await collectWebMovementsBackupExport(this, this.nowIso());
    const fileName = webMovementsBackupFileName(exportData.exportedAt);
    const json = JSON.stringify(exportData, null, 2);
    this.dependencies.backupDownloader.downloadJson(fileName, json);

    return summarizeWebMovementsBackupExport(exportData, fileName);
  }

  async movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult> {
    if (!input.fileBase64.trim()) {
      throw new Error('fileBase64 is required');
    }
    throw new Error('Backup import is only available on Android.');
  }

  async movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    const requestedSize = input.pagination?.size ?? 20;
    const pageSize = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;
    const requestedPage = input.pagination?.page ?? 0;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const filters = input.filters ?? {};

    if (input.source === 'posted') {
      const result = await this.ledgerListTransactions({
        accountId: input.accountId,
        filters: {
          text: filters.text,
          merchant: filters.merchant,
          categoryId: filters.categoryId,
          categoryIds: filters.categoryIds,
          tagIds: filters.tagIds,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          types: filters.types,
          statuses: ['posted'],
        },
        pagination: {
          page,
          size: pageSize,
        },
        sort: input.sort?.map((item) => ({
          field: item.field === 'date' ? 'occurredAt' : item.field,
          direction: item.direction,
        })) ?? [{ field: 'occurredAt', direction: 'desc' }],
      });
      return {
        content: result.content.map((transaction) => mapPostedTransactionToSearchItem(transaction)),
        page: result.page,
        size: result.size,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      };
    }

    if (input.source === 'expected') {
      const sort = input.sort && input.sort.length > 0
        ? input.sort
        : [{ field: 'date' as const, direction: 'desc' as const }];
      const sorted = [...filterExpectedMovements(this.state.expectedMovements, {
        accountId: input.accountId,
        filters,
      })].sort((left, right) => {
        for (const criterion of sort) {
          let comparison = 0;
          if (criterion.field === 'amount') {
            const leftAmount = Number(left.amount);
            const rightAmount = Number(right.amount);
            comparison = (Number.isFinite(leftAmount) ? leftAmount : 0) - (Number.isFinite(rightAmount) ? rightAmount : 0);
          } else {
            comparison = left.expectedAt.localeCompare(right.expectedAt);
          }
          if (comparison !== 0) {
            return criterion.direction === 'asc' ? comparison : -comparison;
          }
        }
        return right.id.localeCompare(left.id);
      });

      const totalElements = sorted.length;
      const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
      const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
      const startIndex = resolvedPage * pageSize;
      const content = sorted.slice(startIndex, startIndex + pageSize);
      return {
        content: content.map((movement) => mapExpectedMovementToSearchItem(movement, (categoryId) => this.categoryNameById(categoryId))),
        page: resolvedPage,
        size: pageSize,
        totalElements,
        totalPages,
        hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
        hasPrevious: resolvedPage > 0,
      };
    }

    const scheduledResult = await this.movementsListScheduled({
      accountId: input.accountId,
      filters,
      pagination: {
        page,
        size: pageSize,
      },
      sort: input.sort?.map((item) => ({
        field: item.field === 'date' ? 'nextDueAt' : item.field,
        direction: item.direction,
      })) ?? [{ field: 'nextDueAt', direction: 'desc' }],
    });

    return {
      content: scheduledResult.content.map((movement) => mapScheduledMovementToSearchItem(
        movement,
        (categoryId) => this.categoryNameById(categoryId),
      )),
      page: scheduledResult.page,
      size: scheduledResult.size,
      totalElements: scheduledResult.totalElements,
      totalPages: scheduledResult.totalPages,
      hasNext: scheduledResult.hasNext,
      hasPrevious: scheduledResult.hasPrevious,
    };
  }

  async movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> {
    return getMovementsSearchFacets(this, input);
  }

  async movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    const requestedPage = input.pagination?.page ?? 0;
    const requestedSize = input.pagination?.size ?? 20;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

    const sorted = [...filterScheduledMovements(this.state.recurringMovements, {
      accountId: input.accountId,
      filters: input.filters,
    })];

    const sort = input.sort && input.sort.length > 0
      ? input.sort
      : [{ field: 'nextDueAt' as const, direction: 'asc' as const }];

    sorted.sort((left, right) => {
      for (const criterion of sort) {
        let comparison = 0;
        if (criterion.field === 'amount') {
          const leftAmount = Number(left.amount);
          const rightAmount = Number(right.amount);
          const safeLeft = Number.isFinite(leftAmount) ? leftAmount : 0;
          const safeRight = Number.isFinite(rightAmount) ? rightAmount : 0;
          comparison = safeLeft - safeRight;
        } else {
          const leftDue = left.nextDueAt ?? left.startAt;
          const rightDue = right.nextDueAt ?? right.startAt;
          comparison = leftDue.localeCompare(rightDue);
        }
        if (comparison !== 0) {
          return criterion.direction === 'asc' ? comparison : -comparison;
        }
      }
      return left.id.localeCompare(right.id);
    });

    const totalElements = sorted.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
    const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const startIndex = resolvedPage * size;
    const content = sorted.slice(startIndex, startIndex + size).map((item) => ({ ...item }));

    return {
      content,
      page: resolvedPage,
      size,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    };
  }
}
