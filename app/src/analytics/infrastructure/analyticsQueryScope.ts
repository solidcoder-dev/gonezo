import type {
  LedgerAccountItem,
  LedgerGetAccountSummaryResult,
  LedgerTransactionFilterInput,
} from '../../ledger/application/ledger.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type {
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsResult,
} from '../../taxonomy/application/taxonomy.port';
import type { SchedulingListMovementsResult } from '../../scheduling/application/scheduling.port';
import {
  normalizeAnalyticsFilters,
  type AnalyticsFilters,
  type AnalyticsFiltersInput,
} from '../application/analyticsFilters';
import type { AnalyticsCategoryReference } from '../application/spendingReport';
import { listAnalyticsMovements, type AnalyticsMovementReaderPort } from './analyticsMovementReader';

export type AnalyticsQueryPort = AnalyticsMovementReaderPort & {
  ledgerGetAccountSummary(input: { accountId: string }): Promise<LedgerGetAccountSummaryResult>;
  preferencesGet(): Promise<UserPreferencesResult>;
  taxonomyListCategories(input?: { appliesTo?: 'income' | 'expense'; includeArchived?: boolean }): Promise<TaxonomyListCategoriesResult>;
  analyticsListCategories?: () => Promise<{ items: AnalyticsCategoryReference[] }>;
  taxonomyListTags(input?: { includeArchived?: boolean }): Promise<TaxonomyListTagsResult>;
  orchestrationListTransactionTaxonomy(input: { transactionIds: string[] }): Promise<OrchestrationListTransactionTaxonomyResult>;
  schedulingListMovements(input: { sourceAccountId: string }): Promise<SchedulingListMovementsResult>;
};

export type AnalyticsQueryScope = Readonly<{
  filters: AnalyticsFilters;
  compatibleAccounts: LedgerAccountItem[];
  selectedAccountIds: string[];
}>;

function dateFilterValue(date: Date): string {
  return date.toISOString();
}

function analyticsWindowDateRange(window: { start: Date; end: Date } | undefined): Pick<LedgerTransactionFilterInput, 'fromDate' | 'toDateExclusive'> {
  if (!window) return {};
  return { fromDate: dateFilterValue(window.start), toDateExclusive: dateFilterValue(window.end) };
}

function assertSupportedAnalyticsCurrency(accounts: LedgerAccountItem[], currency: string): void {
  if (!currency) return;
  const supportedCurrencies = new Set(accounts.map((account) => account.currency.trim().toUpperCase()));
  if (!supportedCurrencies.has(currency)) throw new Error(`unsupported currency code: ${currency}`);
}

function compatibleAnalyticsAccounts(accounts: LedgerAccountItem[], currency: string): LedgerAccountItem[] {
  if (!currency) return [...accounts];
  return accounts.filter((account) => account.currency.trim().toUpperCase() === currency);
}

function resolveSelectedAnalyticsAccounts(accounts: LedgerAccountItem[], filters: AnalyticsFilters): LedgerAccountItem[] {
  const compatibleAccounts = compatibleAnalyticsAccounts(accounts, filters.currency);
  if (filters.accountIds.length === 0) return compatibleAccounts;

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  return filters.accountIds.map((accountId) => {
    const account = accountsById.get(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    if (filters.currency && account.currency.trim().toUpperCase() !== filters.currency) {
      throw new Error(`Analytics account currency must match selected currency (${filters.currency})`);
    }
    return account;
  });
}

function assertValidAnalyticsTagIds(
  tags: Awaited<ReturnType<AnalyticsQueryPort['taxonomyListTags']>>['items'],
  selectedTagIds: string[],
): void {
  if (selectedTagIds.length === 0) return;
  const availableTagIds = new Set(tags.map((tag) => tag.id));
  for (const tagId of selectedTagIds) {
    if (!availableTagIds.has(tagId)) throw new Error(`Tag not found: ${tagId}`);
  }
}

export async function resolveAnalyticsQueryScope(
  port: AnalyticsQueryPort,
  input: AnalyticsFiltersInput | undefined,
): Promise<AnalyticsQueryScope> {
  const filters = normalizeAnalyticsFilters(input);
  const [accounts, tags] = await Promise.all([
    port.ledgerListAccounts(),
    filters.tagIds.length > 0 ? port.taxonomyListTags({ includeArchived: false }) : Promise.resolve({ items: [] }),
  ]);

  assertSupportedAnalyticsCurrency(accounts.items, filters.currency);
  assertValidAnalyticsTagIds(tags.items, filters.tagIds);

  const compatibleAccounts = compatibleAnalyticsAccounts(accounts.items, filters.currency);
  const selectedAccounts = resolveSelectedAnalyticsAccounts(accounts.items, filters);
  return { filters, compatibleAccounts, selectedAccountIds: selectedAccounts.map((account) => account.id) };
}

export function analyticsTransactionFilters(
  scope: AnalyticsFilters,
  window: { start: Date; end: Date } | undefined,
  includeTags: boolean,
): LedgerTransactionFilterInput & { currency: string; includePlannedMovements: boolean } {
  return {
    statuses: ['posted'],
    tagIds: includeTags && scope.tagIds.length > 0 ? scope.tagIds : undefined,
    ...analyticsWindowDateRange(window),
    currency: scope.currency,
    includePlannedMovements: scope.includePlannedMovements,
  };
}

export async function listScopedAnalyticsMovements(
  port: AnalyticsQueryPort,
  input: AnalyticsFiltersInput | AnalyticsFilters | undefined,
  window: { start: Date; end: Date } | undefined,
  includeTags = true,
) {
  const scope = await resolveAnalyticsQueryScope(port, input);
  return listAnalyticsMovements(port, {
    accountIds: scope.selectedAccountIds,
    filters: analyticsTransactionFilters(scope.filters, window, includeTags),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });
}
