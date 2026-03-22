import type {
  CorePort,
  CoreResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
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
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
} from '../domain/corePort';

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
}
