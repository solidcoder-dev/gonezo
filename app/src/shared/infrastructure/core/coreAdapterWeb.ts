import type {
  CorePort,
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
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceEndInput,
  RecurrenceFrequency,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
  RecurrenceMovementItem,
  RecurrenceRuleInput,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  SchedulingMovementItem,
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedMovementItem,
  ExpectedResolveMovementInput,
  LedgerTransactionListItem,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsSearchFiltersInput,
  MovementsSearchInput,
  MovementsSearchItem,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';
import { resolveSchedulingKind } from '../../domain/schedulingKind';

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

type MemoryRecurringMovement = RecurrenceMovementItem & {
  categoryId?: string;
  tagIds?: string[];
  tagNames?: string[];
  scheduleKind?: 'recurring' | 'one_shot';
  origin?: 'recurring' | 'one_shot';
  createdAt: string;
  deactivatedAt?: string;
  completedAt?: string;
};

type MemoryExpectedMovement = ExpectedMovementItem;

export class CoreAdapterWeb implements CorePort {
  private static readonly supportedCurrencies = ['AUD', 'BRL', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'MXN', 'NZD', 'USD'];

  private static ledgerAccounts: MemoryLedgerAccount[] = [];

  private static ledgerTransactions: MemoryLedgerTransaction[] = [];

  private static taxonomyCategories: MemoryTaxonomyCategory[] = [];

  private static taxonomyTags: MemoryTaxonomyTag[] = [];

  private static taxonomyTransactionTags: Map<string, string[]> = new Map();

  private static mobillsImportFingerprintToTransactionId: Map<string, string> = new Map();

  private static recurringMovements: MemoryRecurringMovement[] = [];

  private static expectedMovements: MemoryExpectedMovement[] = [];

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

  private categoryNameById(categoryId?: string): string | undefined {
    if (!categoryId) {
      return undefined;
    }
    return CoreAdapterWeb.taxonomyCategories.find((category) => category.id === categoryId)?.name;
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

  private resolveFrequency(rule: RecurrenceRuleInput): RecurrenceFrequency {
    const normalized = (rule.frequency ?? '').trim().toLowerCase();
    if (normalized === 'daily' || normalized === 'weekly' || normalized === 'monthly' || normalized === 'yearly') {
      return normalized;
    }
    throw new Error(`Unsupported recurrence frequency: ${rule.frequency}`);
  }

  private normalizeRecurrenceRule(rule: RecurrenceRuleInput): RecurrenceRuleInput {
    const frequency = this.resolveFrequency(rule);
    const interval = Math.max(1, Number(rule.interval ?? 1));

    if (frequency === 'daily') {
      return { frequency, interval };
    }

    if (frequency === 'weekly') {
      const weeklyDays = [...new Set((rule.weeklyDays ?? []).map((day) => Number(day)).filter((day) => day >= 1 && day <= 7))];
      if (weeklyDays.length === 0) {
        throw new Error('Weekly recurrence requires at least one weekday');
      }
      return { frequency, interval, weeklyDays };
    }

    if (frequency === 'monthly') {
      const monthlyPattern = rule.monthlyPattern === 'nth_weekday' ? 'nth_weekday' : 'day_of_month';
      if (monthlyPattern === 'day_of_month') {
        const day = rule.dayOfMonth == null ? undefined : Number(rule.dayOfMonth);
        if (day != null && (day < 1 || day > 31)) {
          throw new Error('Monthly dayOfMonth must be between 1 and 31');
        }
        return {
          frequency,
          interval,
          monthlyPattern,
          dayOfMonth: day,
        };
      }
      const ordinal = Number(rule.monthlyWeekOrdinal ?? 1);
      const weekday = Number(rule.monthlyWeekday ?? 1);
      if (ordinal < 1 || ordinal > 5) {
        throw new Error('Monthly ordinal must be between 1 and 5');
      }
      if (weekday < 1 || weekday > 7) {
        throw new Error('Monthly weekday must be between 1 and 7');
      }
      return {
        frequency,
        interval,
        monthlyPattern,
        monthlyWeekOrdinal: ordinal,
        monthlyWeekday: weekday,
      };
    }

    return { frequency, interval };
  }

  private normalizeRecurrenceEnd(input: RecurrenceEndInput): RecurrenceEndInput {
    if (input.kind === 'never') {
      return { kind: 'never' };
    }
    if (input.kind === 'on_date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.onDate.trim())) {
        throw new Error('Recurrence end date must use YYYY-MM-DD');
      }
      return {
        kind: 'on_date',
        onDate: input.onDate.trim(),
      };
    }
    const afterOccurrences = Number(input.afterOccurrences);
    if (!Number.isFinite(afterOccurrences) || afterOccurrences <= 0) {
      throw new Error('Recurrence end count must be greater than 0');
    }
    return {
      kind: 'after_occurrences',
      afterOccurrences,
    };
  }

  private nthWeekdayOfMonth(year: number, monthZeroBased: number, weekdayIso: number, ordinal: number): Date {
    const firstOfMonth = new Date(year, monthZeroBased, 1);
    const jsTargetDay = weekdayIso % 7;
    const offset = (jsTargetDay - firstOfMonth.getDay() + 7) % 7;
    const firstMatch = new Date(year, monthZeroBased, 1 + offset);
    const candidate = new Date(firstMatch);
    candidate.setDate(firstMatch.getDate() + (ordinal - 1) * 7);
    if (candidate.getMonth() !== monthZeroBased) {
      candidate.setDate(candidate.getDate() - 7);
    }
    return candidate;
  }

  private firstDueAtForRule(input: {
    startAt: string;
    zoneId: string;
    rule: RecurrenceRuleInput;
    recurrenceEnd: RecurrenceEndInput;
  }): string | undefined {
    if (!input.zoneId.trim()) {
      throw new Error('zoneId is required');
    }
    const start = new Date(input.startAt);
    if (Number.isNaN(start.getTime())) {
      throw new Error('startAt must be a valid ISO datetime');
    }
    const rule = this.normalizeRecurrenceRule(input.rule);
    const end = this.normalizeRecurrenceEnd(input.recurrenceEnd);

    const anchor = new Date(start);
    const anchorHour = anchor.getHours();
    const anchorMinutes = anchor.getMinutes();
    const anchorSeconds = anchor.getSeconds();
    const anchorMs = anchor.getMilliseconds();
    let candidate = new Date(start);

    const frequency = this.resolveFrequency(rule);
    if (frequency === 'weekly') {
      const weeklyDays = [...new Set((rule.weeklyDays ?? []).map((day) => Number(day)).filter((day) => day >= 1 && day <= 7))]
        .sort((left, right) => left - right);
      const startOfWeek = new Date(anchor);
      const currentIsoDay = ((startOfWeek.getDay() + 6) % 7) + 1;
      startOfWeek.setDate(startOfWeek.getDate() - (currentIsoDay - 1));
      startOfWeek.setHours(anchorHour, anchorMinutes, anchorSeconds, anchorMs);

      let found: Date | undefined;
      for (const day of weeklyDays) {
        const maybe = new Date(startOfWeek);
        maybe.setDate(startOfWeek.getDate() + (day - 1));
        if (maybe.getTime() >= anchor.getTime()) {
          found = maybe;
          break;
        }
      }
      if (!found) {
        const cycleStart = new Date(startOfWeek);
        cycleStart.setDate(cycleStart.getDate() + (rule.interval ?? 1) * 7);
        found = new Date(cycleStart);
        found.setDate(cycleStart.getDate() + (weeklyDays[0] - 1));
      }
      candidate = found;
    }

    if (frequency === 'monthly') {
      const interval = rule.interval ?? 1;
      const monthlyPattern = rule.monthlyPattern === 'nth_weekday' ? 'nth_weekday' : 'day_of_month';
      const iterateCandidate = (year: number, monthZeroBased: number): Date => {
        if (monthlyPattern === 'nth_weekday') {
          const ordinal = Number(rule.monthlyWeekOrdinal ?? 1);
          const weekday = Number(rule.monthlyWeekday ?? 1);
          const date = this.nthWeekdayOfMonth(year, monthZeroBased, weekday, ordinal);
          date.setHours(anchorHour, anchorMinutes, anchorSeconds, anchorMs);
          return date;
        }
        const preferredDay = Number(rule.dayOfMonth ?? anchor.getDate());
        const monthLastDay = new Date(year, monthZeroBased + 1, 0).getDate();
        const date = new Date(year, monthZeroBased, Math.min(preferredDay, monthLastDay));
        date.setHours(anchorHour, anchorMinutes, anchorSeconds, anchorMs);
        return date;
      };

      let year = anchor.getFullYear();
      let month = anchor.getMonth();
      let maybe = iterateCandidate(year, month);
      while (maybe.getTime() < anchor.getTime()) {
        month += interval;
        year += Math.floor(month / 12);
        month %= 12;
        maybe = iterateCandidate(year, month);
      }
      candidate = maybe;
    }

    if (frequency === 'yearly') {
      candidate = new Date(anchor);
    }

    if (end.kind === 'on_date') {
      const candidateDay = candidate.toISOString().slice(0, 10);
      if (candidateDay > end.onDate) {
        return undefined;
      }
    }

    return candidate.toISOString();
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

    const transferOutId = crypto.randomUUID();
    const transferInId = crypto.randomUUID();

    CoreAdapterWeb.ledgerTransactions.push({
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
    CoreAdapterWeb.ledgerTransactions.push({
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
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
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
    const filters = input.filters ?? {};
    const requestedPage = input.pagination?.page ?? 0;
    const requestedSize = input.pagination?.size ?? 20;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

    const fromDateEpoch = filters.fromDate ? Date.parse(filters.fromDate) : undefined;
    const toDateEpoch = filters.toDate ? Date.parse(filters.toDate) : undefined;
    const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
    const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);
    const textFilter = filters.text?.trim().toLowerCase();
    const merchantFilter = filters.merchant?.trim().toLowerCase();
    const statusesFilter = filters.statuses && filters.statuses.length > 0 ? new Set(filters.statuses) : null;
    const typesFilter = filters.types && filters.types.length > 0 ? new Set(filters.types) : null;
    const categoryIds = filters.categoryIds && filters.categoryIds.length > 0
      ? filters.categoryIds
      : filters.categoryId
        ? [filters.categoryId]
        : [];
    const categoryIdsFilter = categoryIds.length > 0
      ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
      : null;
    const tagIdsFilter = filters.tagIds && filters.tagIds.length > 0
      ? new Set(filters.tagIds.map((value) => value.trim()).filter((value) => value.length > 0))
      : null;
    const parsedAmountMin = filters.amountMin == null ? undefined : Number(filters.amountMin);
    const parsedAmountMax = filters.amountMax == null ? undefined : Number(filters.amountMax);
    const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
    const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);

    const sort = input.sort && input.sort.length > 0
      ? input.sort
      : [{ field: 'occurredAt', direction: 'desc' as const }];

    const filtered = CoreAdapterWeb.ledgerTransactions
      .filter((tx) => tx.accountId === input.accountId)
      .filter((tx) => (statusesFilter ? statusesFilter.has(tx.status) : true))
      .filter((tx) => (typesFilter ? typesFilter.has(tx.type) : true))
      .filter((tx) => (categoryIdsFilter ? Boolean(tx.categoryId && categoryIdsFilter.has(tx.categoryId)) : true))
      .filter((tx) => {
        if (!tagIdsFilter) {
          return true;
        }
        const txTagIds = CoreAdapterWeb.taxonomyTransactionTags.get(tx.id) ?? [];
        return txTagIds.some((tagId) => tagIdsFilter.has(tagId));
      })
      .filter((tx) => {
        if (!hasAmountMin && !hasAmountMax) {
          return true;
        }
        const amount = Number(tx.amount);
        if (!Number.isFinite(amount)) {
          return false;
        }
        if (hasAmountMin && amount < parsedAmountMin!) {
          return false;
        }
        if (hasAmountMax && amount > parsedAmountMax!) {
          return false;
        }
        return true;
      })
      .filter((tx) => {
        if (!hasFromDateEpoch) {
          return true;
        }
        const occurredAtEpoch = Date.parse(tx.occurredAt);
        return Number.isFinite(occurredAtEpoch) && occurredAtEpoch >= fromDateEpoch!;
      })
      .filter((tx) => {
        if (!hasToDateEpoch) {
          return true;
        }
        const occurredAtEpoch = Date.parse(tx.occurredAt);
        return Number.isFinite(occurredAtEpoch) && occurredAtEpoch <= toDateEpoch!;
      })
      .filter((tx) => {
        if (!merchantFilter) {
          return true;
        }
        return (tx.merchant ?? '').toLowerCase().includes(merchantFilter);
      })
      .filter((tx) => {
        if (!textFilter) {
          return true;
        }
        const merchant = tx.merchant?.toLowerCase() ?? '';
        const description = tx.description?.toLowerCase() ?? '';
        return merchant.includes(textFilter) || description.includes(textFilter);
      });

    const sorted = [...filtered].sort((left, right) => {
      for (const criterion of sort) {
        let comparison = 0;

        if (criterion.field === 'amount') {
          const leftAmount = Number(left.amount);
          const rightAmount = Number(right.amount);
          const safeLeft = Number.isFinite(leftAmount) ? leftAmount : 0;
          const safeRight = Number.isFinite(rightAmount) ? rightAmount : 0;
          comparison = safeLeft - safeRight;
        } else {
          comparison = left.occurredAt.localeCompare(right.occurredAt);
        }

        if (comparison !== 0) {
          return criterion.direction === 'asc' ? comparison : -comparison;
        }
      }
      return right.id.localeCompare(left.id);
    });

    const totalElements = sorted.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
    const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const startIndex = resolvedPage * size;
    const content = sorted.slice(startIndex, startIndex + size).map((tx) => ({
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
    const normalizedRule = this.normalizeRecurrenceRule(input.rule);
    const normalizedEnd = this.normalizeRecurrenceEnd(input.recurrenceEnd);
    const nextDueAt = this.firstDueAtForRule({
      startAt: input.startAt,
      zoneId: input.zoneId,
      rule: normalizedRule,
      recurrenceEnd: normalizedEnd,
    });
    const id = crypto.randomUUID();
    const movement: MemoryRecurringMovement = {
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
      scheduleKind: 'recurring',
      origin: 'recurring',
      status: nextDueAt ? 'active' : 'completed',
      startAt: new Date(input.startAt).toISOString(),
      nextDueAt,
      zoneId: input.zoneId.trim(),
      generatedOccurrences: 0,
      rule: normalizedRule,
      recurrenceEnd: normalizedEnd,
      createdAt: new Date().toISOString(),
      completedAt: nextDueAt ? undefined : new Date().toISOString(),
    };
    CoreAdapterWeb.recurringMovements.push(movement);
    return { id };
  }

  async recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void> {
    const movement = CoreAdapterWeb.recurringMovements.find((item) => item.id === input.recurringMovementId);
    if (!movement) {
      throw new Error(`Recurring movement not found: ${input.recurringMovementId}`);
    }
    if (movement.status !== 'active') {
      return;
    }
    movement.status = 'deactivated';
    movement.nextDueAt = undefined;
    movement.deactivatedAt = input.deactivatedAt ? new Date(input.deactivatedAt).toISOString() : new Date().toISOString();
  }

  async recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult> {
    const items = CoreAdapterWeb.recurringMovements
      .filter((movement) => this.isMovementVisibleForAccount(movement, input.sourceAccountId))
      .sort((left, right) => {
        if (!left.nextDueAt && !right.nextDueAt) {
          return left.createdAt.localeCompare(right.createdAt);
        }
        if (!left.nextDueAt) {
          return 1;
        }
        if (!right.nextDueAt) {
          return -1;
        }
        return left.nextDueAt.localeCompare(right.nextDueAt);
      })
      .map((movement) => ({ ...movement }));
    return { items };
  }

  async schedulingCreateMovement(
    input: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult> {
    const result = await this.recurrenceCreateRecurringMovement(input);
    if (input.scheduleKind === 'one_shot') {
      const movement = CoreAdapterWeb.recurringMovements.find((item) => item.id === result.id);
      if (movement) {
        movement.scheduleKind = 'one_shot';
        movement.origin = 'one_shot';
      }
    }
    return result;
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

  private movementDateEpoch(movement: MemoryRecurringMovement): number | undefined {
    const candidate = movement.nextDueAt ?? movement.startAt;
    const parsed = candidate ? Date.parse(candidate) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private isMovementVisibleForAccount(movement: MemoryRecurringMovement, accountId: string): boolean {
    if (movement.sourceAccountId === accountId) {
      return true;
    }
    return movement.type === 'transfer' && movement.targetAccountId === accountId;
  }

  private filterScheduledMovements(input: {
    accountId: string;
    filters?: MovementsSearchFiltersInput;
  }): SchedulingMovementItem[] {
    const filters = input.filters ?? {};
    const text = filters.text?.trim().toLowerCase();
    const merchant = filters.merchant?.trim().toLowerCase();
    const categoryIds = filters.categoryIds && filters.categoryIds.length > 0
      ? filters.categoryIds
      : filters.categoryId
        ? [filters.categoryId]
        : [];
    const categoryFilter = categoryIds.length > 0
      ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
      : null;
    const tagFilter = filters.tagIds && filters.tagIds.length > 0
      ? new Set(filters.tagIds.map((value) => value.trim()).filter((value) => value.length > 0))
      : null;
    const parsedAmountMin = filters.amountMin == null ? undefined : Number(filters.amountMin);
    const parsedAmountMax = filters.amountMax == null ? undefined : Number(filters.amountMax);
    const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
    const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);
    const fromDateEpoch = filters.fromDate ? Date.parse(filters.fromDate) : undefined;
    const toDateEpoch = filters.toDate ? Date.parse(filters.toDate) : undefined;
    const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
    const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);
    const typeFilter = filters.types && filters.types.length > 0
      ? new Set(filters.types.filter((value) => value === 'expense' || value === 'income' || value === 'transfer'))
      : null;

    const filtered = CoreAdapterWeb.recurringMovements
      .filter((movement) => this.isMovementVisibleForAccount(movement, input.accountId))
      .filter((movement) => (typeFilter ? typeFilter.has(movement.type) : true))
      .filter((movement) => {
        if (!categoryFilter) {
          return true;
        }
        return Boolean(movement.categoryId && categoryFilter.has(movement.categoryId));
      })
      .filter((movement) => {
        if (!tagFilter) {
          return true;
        }
        const movementTags = movement.tagIds ?? [];
        return movementTags.some((tagId) => tagFilter.has(tagId));
      })
      .filter((movement) => {
        if (!hasAmountMin && !hasAmountMax) {
          return true;
        }
        const amount = Number(movement.amount);
        if (!Number.isFinite(amount)) {
          return false;
        }
        if (hasAmountMin && amount < parsedAmountMin!) {
          return false;
        }
        if (hasAmountMax && amount > parsedAmountMax!) {
          return false;
        }
        return true;
      })
      .filter((movement) => {
        if (!hasFromDateEpoch && !hasToDateEpoch) {
          return true;
        }
        const dueEpoch = this.movementDateEpoch(movement);
        if (dueEpoch == null) {
          return false;
        }
        if (hasFromDateEpoch && dueEpoch < fromDateEpoch!) {
          return false;
        }
        if (hasToDateEpoch && dueEpoch > toDateEpoch!) {
          return false;
        }
        return true;
      })
      .filter((movement) => {
        if (!merchant) {
          return true;
        }
        return (movement.merchant ?? '').toLowerCase().includes(merchant);
      })
      .filter((movement) => {
        if (!text) {
          return true;
        }
        const merchantText = movement.merchant?.toLowerCase() ?? '';
        const descriptionText = movement.description?.toLowerCase() ?? '';
        return merchantText.includes(text) || descriptionText.includes(text);
      })
      .sort((left, right) => {
        if (!left.nextDueAt && !right.nextDueAt) {
          return left.createdAt.localeCompare(right.createdAt);
        }
        if (!left.nextDueAt) {
          return 1;
        }
        if (!right.nextDueAt) {
          return -1;
        }
        return left.nextDueAt.localeCompare(right.nextDueAt);
      });

    return filtered.map((item) => {
      const kind = resolveSchedulingKind(item);
      return {
        ...item,
        scheduleKind: kind,
        origin: kind,
      };
    }) as SchedulingMovementItem[];
  }

  async movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    const previewSize = input.scheduledPreviewSize != null && input.scheduledPreviewSize > 0
      ? Math.min(Math.trunc(input.scheduledPreviewSize), 20)
      : 5;
    const expectedPreviewSize = input.expectedPreviewSize != null && input.expectedPreviewSize > 0
      ? Math.min(Math.trunc(input.expectedPreviewSize), 20)
      : previewSize;
    const fromDate = input.fromDate ?? input.filters?.fromDate;
    const toDate = input.toDate ?? input.filters?.toDate;

    const scheduledFiltered = this.filterScheduledMovements({
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
      },
    });
    const expectedFiltered = this.filterExpectedMovements({
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
        items: scheduledFiltered.slice(0, previewSize),
        total: scheduledFiltered.length,
        hasMore: scheduledFiltered.length > previewSize,
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

  private mapPostedTransactionToSearchItem(transaction: LedgerTransactionListItem): MovementsSearchItem {
    return {
      id: transaction.id,
      source: 'posted',
      type: transaction.type,
      status: transaction.status === 'voided' ? 'voided' : 'posted',
      amount: transaction.amount,
      currency: transaction.currency,
      occurredAt: transaction.occurredAt,
      title: transaction.merchant || transaction.description || 'Movement',
      description: transaction.description,
      merchant: transaction.merchant,
      categoryId: transaction.categoryId,
      category: transaction.category,
      tags: transaction.tags,
    };
  }

  private mapScheduledMovementToSearchItem(movement: SchedulingMovementItem): MovementsSearchItem {
    const tags = (movement.tagNames ?? movement.tagIds ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => ({ id: tag, name: tag }));
    return {
      id: movement.id,
      source: 'scheduled',
      type: movement.type,
      status: movement.status === 'active' ? 'scheduled' : movement.status === 'deactivated' ? 'deactivated' : 'failed',
      amount: movement.amount,
      currency: movement.currency,
      occurredAt: movement.nextDueAt ?? movement.startAt,
      title: movement.merchant || movement.description || 'Scheduled movement',
      description: movement.description,
      merchant: movement.merchant,
      category: movement.categoryId ? { id: movement.categoryId, name: this.categoryNameById(movement.categoryId) ?? movement.categoryId } : undefined,
      tags,
    };
  }

  private filterExpectedMovements(input: {
    accountId: string;
    filters?: MovementsSearchFiltersInput;
    includeClosed?: boolean;
  }): ExpectedMovementItem[] {
    const filters = input.filters ?? {};
    const text = filters.text?.trim().toLowerCase();
    const merchant = filters.merchant?.trim().toLowerCase();
    const categoryIds = filters.categoryIds && filters.categoryIds.length > 0
      ? filters.categoryIds
      : filters.categoryId
        ? [filters.categoryId]
        : [];
    const categoryFilter = categoryIds.length > 0
      ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
      : null;
    const typeFilter = filters.types && filters.types.length > 0
      ? new Set(filters.types.filter((value) => value === 'expense' || value === 'income'))
      : null;
    const parsedAmountMin = filters.amountMin == null ? undefined : Number(filters.amountMin);
    const parsedAmountMax = filters.amountMax == null ? undefined : Number(filters.amountMax);
    const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
    const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);
    const fromDateEpoch = filters.fromDate ? Date.parse(filters.fromDate) : undefined;
    const toDateEpoch = filters.toDate ? Date.parse(filters.toDate) : undefined;
    const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
    const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

    return CoreAdapterWeb.expectedMovements
      .filter((movement) => movement.accountId === input.accountId)
      .filter((movement) => input.includeClosed || movement.status === 'pending')
      .filter((movement) => (typeFilter ? typeFilter.has(movement.type) : true))
      .filter((movement) => (categoryFilter ? Boolean(movement.categoryId && categoryFilter.has(movement.categoryId)) : true))
      .filter((movement) => {
        if (!hasAmountMin && !hasAmountMax) {
          return true;
        }
        const amount = Number(movement.amount);
        if (!Number.isFinite(amount)) {
          return false;
        }
        if (hasAmountMin && amount < parsedAmountMin!) {
          return false;
        }
        if (hasAmountMax && amount > parsedAmountMax!) {
          return false;
        }
        return true;
      })
      .filter((movement) => {
        if (!hasFromDateEpoch && !hasToDateEpoch) {
          return true;
        }
        const expectedAtEpoch = Date.parse(movement.expectedAt);
        if (!Number.isFinite(expectedAtEpoch)) {
          return false;
        }
        if (hasFromDateEpoch && expectedAtEpoch < fromDateEpoch!) {
          return false;
        }
        if (hasToDateEpoch && expectedAtEpoch > toDateEpoch!) {
          return false;
        }
        return true;
      })
      .filter((movement) => {
        if (!merchant) {
          return true;
        }
        return (movement.merchant ?? '').toLowerCase().includes(merchant);
      })
      .filter((movement) => {
        if (!text) {
          return true;
        }
        const merchantText = movement.merchant?.toLowerCase() ?? '';
        const descriptionText = movement.description?.toLowerCase() ?? '';
        return merchantText.includes(text) || descriptionText.includes(text);
      });
  }

  private mapExpectedMovementToSearchItem(movement: ExpectedMovementItem): MovementsSearchItem {
    return {
      id: movement.id,
      source: 'expected',
      type: movement.type,
      status: movement.status === 'pending' ? 'expected' : movement.status,
      amount: movement.amount,
      currency: movement.currency,
      occurredAt: movement.expectedAt,
      title: movement.merchant || movement.description || 'Expected movement',
      description: movement.description,
      merchant: movement.merchant,
      categoryId: movement.categoryId,
      category: movement.categoryId ? { id: movement.categoryId, name: this.categoryNameById(movement.categoryId) ?? movement.categoryId } : undefined,
      tags: [],
    };
  }

  async expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Expected movement amount must be greater than 0');
    }
    const expectedAt = input.expectedAt.trim() || new Date().toISOString();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    CoreAdapterWeb.expectedMovements.push({
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
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  }

  async expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    this.accountOrThrow(input.accountId);
    return {
      items: this.filterExpectedMovements({
        accountId: input.accountId,
        includeClosed: input.includeClosed === true,
      }),
    };
  }

  async expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void> {
    const movement = CoreAdapterWeb.expectedMovements.find((item) => item.id === input.expectedMovementId);
    if (!movement) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    const transactionId = input.transactionId.trim();
    if (!transactionId) {
      throw new Error('transactionId is required');
    }
    movement.status = 'resolved';
    movement.resolvedTransactionId = transactionId;
    movement.resolvedAt = input.resolvedAt ?? new Date().toISOString();
    movement.updatedAt = movement.resolvedAt;
  }

  async expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void> {
    const movement = CoreAdapterWeb.expectedMovements.find((item) => item.id === input.expectedMovementId);
    if (!movement) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    movement.status = 'dismissed';
    movement.dismissedAt = input.dismissedAt ?? new Date().toISOString();
    movement.updatedAt = movement.dismissedAt;
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
        content: result.content.map((transaction) => this.mapPostedTransactionToSearchItem(transaction)),
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
      const sorted = [...this.filterExpectedMovements({
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
        content: content.map((movement) => this.mapExpectedMovementToSearchItem(movement)),
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
      content: scheduledResult.content.map((movement) => this.mapScheduledMovementToSearchItem(movement)),
      page: scheduledResult.page,
      size: scheduledResult.size,
      totalElements: scheduledResult.totalElements,
      totalPages: scheduledResult.totalPages,
      hasNext: scheduledResult.hasNext,
      hasPrevious: scheduledResult.hasPrevious,
    };
  }

  async movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    const requestedPage = input.pagination?.page ?? 0;
    const requestedSize = input.pagination?.size ?? 20;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

    const sorted = [...this.filterScheduledMovements({
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
