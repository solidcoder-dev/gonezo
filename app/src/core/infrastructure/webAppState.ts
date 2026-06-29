import type { RecurrenceMovementItem } from '../../scheduling/application/scheduling.port';
import type { ExpectedMovementItem } from '../../expected/application/expected.port';

export type WebLedgerAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

export type WebLedgerTransactionItem = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

export type WebLedgerTransaction = {
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
  items: WebLedgerTransactionItem[];
};

export type WebTaxonomyCategory = {
  id: string;
  name: string;
  normalizedName: string;
  appliesTo: 'income' | 'expense';
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

export type WebTaxonomyTag = {
  id: string;
  name: string;
  normalizedName: string;
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

export type WebRecurringMovement = RecurrenceMovementItem & {
  categoryId?: string;
  tagIds?: string[];
  tagNames?: string[];
  scheduleKind?: 'recurring' | 'one_shot';
  origin?: 'recurring' | 'one_shot';
  createdAt: string;
  deactivatedAt?: string;
  completedAt?: string;
};

export type WebExpectedMovement = ExpectedMovementItem;

export type WebSharingPerson = {
  id: string;
  name: string;
  normalizedName: string;
  email?: string;
  createdAt: string;
  archivedAt?: string;
};

export type WebShareParticipant = {
  participantId: string;
  personId: string;
  amount: string;
  reimbursable: boolean;
  expectedMovementId?: string;
};

export type WebExpenseShare = {
  id: string;
  transactionId: string;
  payerPersonId: string;
  totalAmount: string;
  currency: string;
  participants: WebShareParticipant[];
  createdAt: string;
  updatedAt: string;
};

export type WebAnalyticsExclusion = {
  id: string;
  scopeType: 'movement' | 'split_item' | 'share_participant' | 'expected_movement';
  scopeId: string;
  reason: 'user_ignored' | 'shared_expense' | 'reimbursement';
  createdAt: string;
};

export type WebRecurringMovementOccurrence = {
  id: string;
  recurringMovementId: string;
  dueAt: string;
};

export type WebAppState = {
  supportedCurrencies: readonly string[];
  ledgerAccounts: WebLedgerAccount[];
  ledgerTransactions: WebLedgerTransaction[];
  taxonomyCategories: WebTaxonomyCategory[];
  taxonomyTags: WebTaxonomyTag[];
  taxonomyTransactionTags: Map<string, string[]>;
  mobillsImportFingerprintToTransactionId: Map<string, string>;
  recurringMovements: WebRecurringMovement[];
  recurringMovementOccurrences: WebRecurringMovementOccurrence[];
  expectedMovements: WebExpectedMovement[];
  sharingPersons: WebSharingPerson[];
  expenseShares: WebExpenseShare[];
  analyticsExclusions: WebAnalyticsExclusion[];
  defaultAccountId: string | null;
};

export const DEFAULT_WEB_SUPPORTED_CURRENCIES = [
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'EUR',
  'GBP',
  'JPY',
  'MXN',
  'NZD',
  'USD',
] as const;

export function createWebAppState(overrides: Partial<WebAppState> = {}): WebAppState {
  return {
    supportedCurrencies: DEFAULT_WEB_SUPPORTED_CURRENCIES,
    ledgerAccounts: [],
    ledgerTransactions: [],
    taxonomyCategories: [],
    taxonomyTags: [],
    taxonomyTransactionTags: new Map(),
    mobillsImportFingerprintToTransactionId: new Map(),
    recurringMovements: [],
    recurringMovementOccurrences: [],
    expectedMovements: [],
    sharingPersons: [],
    expenseShares: [],
    analyticsExclusions: [],
    defaultAccountId: null,
    ...overrides,
  };
}

export const defaultWebAppState = createWebAppState();
