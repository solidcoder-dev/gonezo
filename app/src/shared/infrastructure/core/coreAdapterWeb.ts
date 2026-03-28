import type {
  CorePort,
  CoreResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerDeleteAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
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
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  MobillsImportInput,
  MobillsImportResult,
  MobillsImportRowResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
} from '../../domain/corePort';

type MemoryLedgerAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

type MemoryLedgerTransactionItem = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

type MemoryLedgerTransaction = {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';
  status: 'draft' | 'posted' | 'voided';
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  linkedTransactionId?: string;
  items: MemoryLedgerTransactionItem[];
};

type MemoryTaxonomyCategory = {
  id: string;
  name: string;
  normalizedName: string;
  appliesTo: 'income' | 'expense';
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

type MemoryTaxonomyTag = {
  id: string;
  name: string;
  normalizedName: string;
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

export class CoreAdapterWeb implements CorePort {
  private static readonly supportedCurrencies = ['AUD', 'BRL', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'MXN', 'NZD', 'USD'];

  private static ledgerAccounts: MemoryLedgerAccount[] = [];

  private static ledgerTransactions: MemoryLedgerTransaction[] = [];

  private static taxonomyCategories: MemoryTaxonomyCategory[] = [];

  private static taxonomyTags: MemoryTaxonomyTag[] = [];

  private static taxonomyTransactionTags: Map<string, string[]> = new Map();

  private static mobillsImportFingerprintToTransactionId: Map<string, string> = new Map();

  private accountOrThrow(accountId: string): MemoryLedgerAccount {
    const account = CoreAdapterWeb.ledgerAccounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  private transactionOrThrow(transactionId: string): MemoryLedgerTransaction {
    const transaction = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  private normalizeCategoryName(name: string): string {
    return name.trim().toLowerCase();
  }

  private normalizeTagName(name: string): string {
    return name.trim().toLowerCase();
  }

  private ensureAccountCanPost(account: MemoryLedgerAccount, currency: string) {
    if (account.status !== 'active') {
      throw new Error('Archived accounts cannot accept transactions');
    }
    if (account.currency !== currency.toUpperCase()) {
      throw new Error(`Transaction currency must match account currency (${account.currency})`);
    }
  }

  private netForAccount(accountId: string): number {
    let net = 0;
    for (const tx of CoreAdapterWeb.ledgerTransactions) {
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

  private decodeBase64ToText(fileBase64: string): string {
    let binary: string;
    try {
      binary = globalThis.atob(fileBase64);
    } catch {
      throw new Error('Invalid import file payload');
    }

    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const utf16 = new TextDecoder('utf-16').decode(bytes).replace(/\uFEFF/g, '');
    if (utf16.includes('\t') || utf16.includes('\n')) {
      return utf16;
    }
    return new TextDecoder().decode(bytes).replace(/\uFEFF/g, '');
  }

  private detectDelimiter(headerLine: string): '\t' | ',' | ';' {
    const tabs = this.countDelimiterOutsideQuotes(headerLine, '\t');
    const commas = this.countDelimiterOutsideQuotes(headerLine, ',');
    const semicolons = this.countDelimiterOutsideQuotes(headerLine, ';');

    const candidates: Array<{ delimiter: '\t' | ',' | ';'; count: number }> = [
      { delimiter: '\t', count: tabs },
      { delimiter: ';', count: semicolons },
      { delimiter: ',', count: commas },
    ];

    let best = candidates[0];
    for (const candidate of candidates) {
      if (candidate.count > best.count) {
        best = candidate;
      }
    }

    return best.delimiter;
  }

  private countDelimiterOutsideQuotes(line: string, delimiter: '\t' | ',' | ';'): number {
    let inQuotes = false;
    let count = 0;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        const escapedQuote = inQuotes && line[index + 1] === '"';
        if (escapedQuote) {
          index += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (char === delimiter && !inQuotes) {
        count += 1;
      }
    }

    return count;
  }

  private splitDelimited(line: string, delimiter: '\t' | ',' | ';'): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        const escapedQuote = inQuotes && line[index + 1] === '"';
        if (escapedQuote) {
          current += '"';
          index += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (char === delimiter && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    cells.push(current);
    return cells;
  }

  private normalizeHeaderName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private findHeaderIndex(headers: string[], aliases: string[]): number {
    const normalizedAliases = aliases.map((alias) => this.normalizeHeaderName(alias));
    return headers.findIndex((header) => normalizedAliases.includes(this.normalizeHeaderName(header)));
  }

  private parseMobillsValue(value: string): number | null {
    const normalized = value
      .trim()
      .replace(/\s/g, '')
      .replace(/\u00A0/g, '')
      .replace(/[€$£]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private parseMobillsDate(rawValue: string): string | null {
    const value = rawValue.trim();
    if (!value) {
      return null;
    }

    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
      return direct.toISOString();
    }

    const dateParts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!dateParts) {
      return null;
    }

    const day = Number(dateParts[1]);
    const month = Number(dateParts[2]) - 1;
    const year = Number(dateParts[3]);
    const parsed = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private parseTransferDescriptor(input: {
    description?: string;
    rowAccountName: string;
    rawValue: number;
  }): { outAccountName: string; inAccountName: string } | null {
    const description = input.description?.trim();
    if (!description || !description.toLowerCase().startsWith('transfer ')) {
      return null;
    }
    const body = description.slice('transfer '.length).trim();
    if (!body) {
      return null;
    }
    const rowAccountName = input.rowAccountName.trim();
    if (!rowAccountName) {
      return null;
    }

    if (input.rawValue < 0) {
      const fromPrefix = new RegExp(`^${this.escapeRegExp(rowAccountName)}\\s+`, 'i');
      if (!fromPrefix.test(body)) {
        return null;
      }
      const inAccountName = body.replace(fromPrefix, '').trim();
      if (!inAccountName) {
        return null;
      }
      return {
        outAccountName: rowAccountName,
        inAccountName,
      };
    }

    if (input.rawValue > 0) {
      const toSuffix = new RegExp(`\\s+${this.escapeRegExp(rowAccountName)}$`, 'i');
      if (!toSuffix.test(body)) {
        return null;
      }
      const outAccountName = body.replace(toSuffix, '').trim();
      if (!outAccountName) {
        return null;
      }
      return {
        outAccountName,
        inAccountName: rowAccountName,
      };
    }

    return null;
  }

  private async resolveImportAccount(
    accountName: string,
    currency: string,
    createMissingAccounts: boolean,
  ): Promise<MemoryLedgerAccount> {
    const normalizedName = accountName.trim();
    let account = CoreAdapterWeb.ledgerAccounts.find(
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
      account = CoreAdapterWeb.ledgerAccounts.find((item) => item.id === opened.id);
    }
    if (!account) {
      throw new Error(`Account not found: ${normalizedName}`);
    }
    return account;
  }

  private buildMobillsFingerprint(input: {
    accountName: string;
    occurredAt: string;
    rawValue: number;
    currency: string;
    description?: string;
    merchant?: string;
  }): string {
    const accountName = input.accountName.trim().toLowerCase();
    const currency = input.currency.trim().toUpperCase();
    const occurredAt = input.occurredAt.trim();
    const signedValue = String(input.rawValue);
    const description = (input.description ?? '').trim().toLowerCase();
    const merchant = (input.merchant ?? '').trim().toLowerCase();
    return ['mobills', accountName, occurredAt, signedValue, currency, description, merchant].join('|');
  }

  async doThing(input: string): Promise<CoreResult> {
    return {
      status: 'ok',
      message: `web adapter ok: ${input}`,
    };
  }

  async ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    const id = crypto.randomUUID();
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    const currency = input.currency.toUpperCase();
    if (!CoreAdapterWeb.supportedCurrencies.includes(currency)) {
      throw new Error(`unsupported currency code: ${currency}`);
    }
    const openingBalanceRaw = input.openingBalanceAmount?.trim();
    const openingBalance = openingBalanceRaw ? Number(openingBalanceRaw) : 0;
    if (Number.isNaN(openingBalance)) {
      throw new Error('opening balance must be a valid number');
    }

    CoreAdapterWeb.ledgerAccounts.push({
      id,
      name,
      type: (input.type ?? 'cash').toLowerCase(),
      currency,
      status: 'active',
      createdAt: input.createdAt ?? new Date().toISOString(),
    });
    if (openingBalance !== 0) {
      CoreAdapterWeb.ledgerTransactions.push({
        id: crypto.randomUUID(),
        accountId: id,
        type: openingBalance > 0 ? 'income' : 'expense',
        status: 'posted',
        amount: Math.abs(openingBalance).toFixed(2),
        currency,
        occurredAt: input.createdAt ?? new Date().toISOString(),
        description: 'Opening balance',
        items: [],
      });
    }
    return { id };
  }

  async ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return { items: [...CoreAdapterWeb.supportedCurrencies] };
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
    account.archivedAt = input.archivedAt ?? new Date().toISOString();
  }

  async ledgerDeleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.accountOrThrow(accountId);

    const deletedTransactionIds = new Set(
      CoreAdapterWeb.ledgerTransactions
        .filter((tx) => tx.accountId === accountId)
        .map((tx) => tx.id),
    );

    CoreAdapterWeb.ledgerTransactions = CoreAdapterWeb.ledgerTransactions
      .filter((tx) => tx.accountId !== accountId);
    CoreAdapterWeb.ledgerAccounts = CoreAdapterWeb.ledgerAccounts
      .filter((account) => account.id !== accountId);

    for (const transactionId of deletedTransactionIds) {
      CoreAdapterWeb.taxonomyTransactionTags.delete(transactionId);
    }
    if (deletedTransactionIds.size > 0) {
      CoreAdapterWeb.mobillsImportFingerprintToTransactionId = new Map(
        [...CoreAdapterWeb.mobillsImportFingerprintToTransactionId.entries()]
          .filter(([, transactionId]) => !deletedTransactionIds.has(transactionId)),
      );
    }
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return {
      items: CoreAdapterWeb.ledgerAccounts.map((account) => ({
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
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
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
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
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

    const transferOutId = crypto.randomUUID();
    const transferInId = crypto.randomUUID();
    const currency = input.currency.toUpperCase();

    CoreAdapterWeb.ledgerTransactions.push({
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
    CoreAdapterWeb.ledgerTransactions.push({
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

  async ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'expense',
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
    const tx = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === input.transactionId);
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
      id: crypto.randomUUID(),
      name: input.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      categoryId: input.categoryId,
      note: input.note,
    });
  }

  async ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    const tx = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === input.transactionId);
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
    const tx = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'posted') {
      throw new Error('Only posted transactions can be voided');
    }
    tx.status = 'voided';
    if (tx.linkedTransactionId) {
      const linked = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === tx.linkedTransactionId);
      if (linked?.status === 'posted') {
        linked.status = 'voided';
      }
    }
  }

  async ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    const limit = input.limit ?? 20;
    const includeVoided = input.includeVoided === true;
    const items = CoreAdapterWeb.ledgerTransactions
      .filter((tx) => tx.accountId === input.accountId)
      .filter((tx) => includeVoided || tx.status !== 'voided')
      .filter((tx) => !input.fromDate || tx.occurredAt >= input.fromDate)
      .filter((tx) => !input.toDate || tx.occurredAt <= input.toDate)
      .filter((tx) => !input.categoryId || tx.categoryId === input.categoryId)
      .filter((tx) => !input.merchant || tx.merchant?.toLowerCase() === input.merchant.toLowerCase())
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit)
      .map((tx) => ({
        id: tx.id,
        accountId: tx.accountId,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        occurredAt: tx.occurredAt,
        description: tx.description,
        merchant: tx.merchant,
        categoryId: tx.categoryId,
        items: tx.items.map((item) => ({ ...item })),
      }));

    return { items };
  }

  async taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    const includeArchived = input?.includeArchived === true;
    const items = CoreAdapterWeb.taxonomyCategories
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
    const existing = CoreAdapterWeb.taxonomyCategories.find(
      (category) => category.normalizedName === normalizedName && category.appliesTo === appliesTo,
    );
    if (existing) {
      throw new Error(`Category already exists for ${appliesTo}: ${name}`);
    }

    const id = crypto.randomUUID();
    CoreAdapterWeb.taxonomyCategories.push({
      id,
      name,
      normalizedName,
      appliesTo,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    return { id };
  }

  async taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    const includeArchived = input?.includeArchived === true;
    const items = CoreAdapterWeb.taxonomyTags
      .filter((tag) => includeArchived || tag.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        status: tag.status,
      }));

    return { items };
  }

  async mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult> {
    const policy = {
      createMissingAccounts: input.policy?.createMissingAccounts === true,
      createMissingCategories: input.policy?.createMissingCategories !== false,
      createMissingTags: input.policy?.createMissingTags !== false,
      duplicatePolicy: input.policy?.duplicatePolicy ?? 'skip',
    };

    const content = this.decodeBase64ToText(input.fileBase64);
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

    const delimiter = this.detectDelimiter(lines[0]);
    const header = this.splitDelimited(lines[0], delimiter);
    const dateIndex = this.findHeaderIndex(header, ['date', 'fecha']);
    const accountIndex = this.findHeaderIndex(header, ['account', 'cuenta']);
    const valueIndex = this.findHeaderIndex(header, ['value', 'amount', 'valor', 'importe']);
    if (dateIndex < 0 || accountIndex < 0 || valueIndex < 0) {
      throw new Error('Missing required columns: date/account/value');
    }
    const currencyIndex = this.findHeaderIndex(header, ['currency', 'moneda']);
    const descriptionIndex = this.findHeaderIndex(header, ['description', 'descripcion', 'concept', 'note']);
    const merchantIndex = this.findHeaderIndex(header, ['merchant', 'counterparty', 'store', 'payee', 'comercio']);
    const categoryIndex = this.findHeaderIndex(header, ['category', 'categoria']);
    const tagsIndex = this.findHeaderIndex(header, ['tags', 'etiquetas', 'tag']);

    const rows: MobillsImportRowResult[] = [];
    for (let index = 1; index < lines.length; index += 1) {
      const sourceLine = index + 1;
      const cells = this.splitDelimited(lines[index], delimiter);
      const accountName = (cells[accountIndex] ?? '').trim();
      const occurredAt = this.parseMobillsDate(cells[dateIndex] ?? '');
      const rawValue = this.parseMobillsValue(cells[valueIndex] ?? '');

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
      const transferDescriptor = this.parseTransferDescriptor({
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

      const fingerprint = this.buildMobillsFingerprint({
        accountName,
        occurredAt,
        rawValue,
        currency,
        description,
        merchant,
      });
      const duplicateOfTransactionId = CoreAdapterWeb.mobillsImportFingerprintToTransactionId.get(fingerprint);
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
            let category = CoreAdapterWeb.taxonomyCategories.find(
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
              category = CoreAdapterWeb.taxonomyCategories.find((item) => item.id === created.id);
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
        if (!CoreAdapterWeb.mobillsImportFingerprintToTransactionId.has(fingerprint)) {
          CoreAdapterWeb.mobillsImportFingerprintToTransactionId.set(fingerprint, transactionId);
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

    const category = CoreAdapterWeb.taxonomyCategories.find((item) => item.id === input.categoryId);
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
      CoreAdapterWeb.taxonomyTransactionTags.set(input.transactionId, []);
      return { status: 'none' };
    }

    const tagIds: string[] = [];
    for (const [normalizedName, originalName] of uniqueByNormalizedName) {
      const existing = CoreAdapterWeb.taxonomyTags.find((tag) => tag.normalizedName === normalizedName);
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

      const id = crypto.randomUUID();
      CoreAdapterWeb.taxonomyTags.push({
        id,
        name: originalName,
        normalizedName,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      tagIds.push(id);
    }

    CoreAdapterWeb.taxonomyTransactionTags.set(input.transactionId, tagIds);
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
      const transaction = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === transactionId);
      const tagIds = CoreAdapterWeb.taxonomyTransactionTags.get(transactionId) ?? [];
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
}
