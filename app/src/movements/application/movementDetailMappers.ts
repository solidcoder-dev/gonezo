import { formatCurrencyAmount, formatIsoDate, formatIsoDateTime } from '../../shared/utils/formatting';
import { normalizeTaxonomyName } from '../../transactions/application/transactionTaxonomySelection';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import type {
  MovementDetailCategoryOption,
  MovementDetailCategoryView,
  MovementDetailFinancialType,
  MovementDetailSelection,
  MovementDetailTagOption,
  MovementDetailTagView,
  MovementDetailViewModel,
  SharingDetailState,
  SharingViewModel,
} from './movementDetailView.types';

function movementDetailFinancialType(type: TransactionHistoryItemView['type'] | ExpectedMovementView['type'] | ScheduledMovementView['type']): MovementDetailFinancialType {
  if (type === 'transfer' || type === 'transfer_in' || type === 'transfer_out') {
    return 'transfer';
  }
  return type;
}

function movementDetailAmountSign(financialType: MovementDetailFinancialType): '+' | '-' | '' {
  if (financialType === 'income') {
    return '+';
  }
  if (financialType === 'expense') {
    return '-';
  }
  return '';
}

export function movementDetailIconClassName(financialType: MovementDetailFinancialType): string {
  if (financialType === 'income') {
    return 'bi bi-arrow-up-right';
  }
  if (financialType === 'transfer') {
    return 'bi bi-arrow-left-right';
  }
  return 'bi bi-arrow-down-right';
}

export function movementDetailTypeLabel(financialType: MovementDetailFinancialType): 'Income' | 'Expense' | 'Transfer' {
  if (financialType === 'income') {
    return 'Income';
  }
  if (financialType === 'transfer') {
    return 'Transfer';
  }
  return 'Expense';
}

function titleFromMovement(input: {
  merchant?: string;
  description?: string;
  source: MovementDetailSelection['source'];
  financialType: MovementDetailFinancialType;
}): string {
  if (input.merchant?.trim()) {
    return input.merchant.trim();
  }
  if (input.description?.trim()) {
    return input.description.trim();
  }
  if (input.source === 'expected') {
    return input.financialType === 'income' ? 'Expected income' : 'Expected expense';
  }
  if (input.source === 'scheduled') {
    return 'Scheduled movement';
  }
  return movementDetailTypeLabel(input.financialType);
}

export function movementDetailAmountLabel(amount: string, currency: string): string {
  return formatCurrencyAmount(amount, currency);
}

export function movementDetailRowAmount(amount: string, currency?: string): string {
  if (!currency) {
    return amount;
  }
  return formatCurrencyAmount(amount, currency);
}

function formatHeroDateLabel(value: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const today = new Date();
  const sameDay = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  if (sameDay) {
    return `Today, ${time}`;
  }
  const day = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(date);
  return `${day}, ${time}`;
}

function movementCategory(categoryId: string | undefined, options: MovementDetailCategoryOption[]): MovementDetailCategoryView | undefined {
  if (!categoryId) {
    return undefined;
  }
  const option = options.find((item) => item.id === categoryId);
  if (!option) {
    return undefined;
  }
  return { id: option.id, name: option.name };
}

function movementTags(
  tags: Array<{ id?: string; name: string }>,
): MovementDetailTagView[] {
  const uniqueByName = new Map<string, MovementDetailTagView>();
  for (const tag of tags) {
    const normalized = normalizeTaxonomyName(tag.name);
    if (!normalized || uniqueByName.has(normalized)) {
      continue;
    }
    uniqueByName.set(normalized, { id: tag.id, name: tag.name.trim() });
  }
  return [...uniqueByName.values()];
}

function scheduleSummary(movement: ScheduledMovementView): string {
  const interval = movement.rule.interval ?? 1;
  if (movement.rule.frequency === 'daily') {
    return interval === 1 ? 'Every day' : `Every ${interval} days`;
  }
  if (movement.rule.frequency === 'weekly') {
    return interval === 1 ? 'Every week' : `Every ${interval} weeks`;
  }
  if (movement.rule.frequency === 'yearly') {
    return interval === 1 ? 'Every year' : `Every ${interval} years`;
  }
  if (movement.rule.monthlyPattern === 'nth_weekday') {
    return interval === 1 ? 'Every month' : `Every ${interval} months`;
  }
  return interval === 1 ? 'Every month' : `Every ${interval} months`;
}

function expectedOriginLabel(movement: ExpectedMovementView): string {
  return movement.originOccurrenceId ? 'Recurring' : 'Manual';
}

function scheduledOriginLabel(movement: ScheduledMovementView): string {
  return movement.origin === 'one_shot' || movement.scheduleKind === 'one_shot' ? 'One-shot' : 'Recurring';
}

function mapPostedMovement(
  transaction: TransactionHistoryItemView,
  categories: MovementDetailCategoryOption[],
  sharing: SharingDetailState,
): MovementDetailViewModel {
  const financialType = movementDetailFinancialType(transaction.type);
  return {
    id: transaction.id,
    source: 'posted',
    raw: transaction,
    financialType,
    title: titleFromMovement({
      merchant: transaction.merchant,
      description: transaction.description,
      source: 'posted',
      financialType,
    }),
    accountLabel: transaction.accountName,
    dateLabel: formatHeroDateLabel(transaction.occurredAt),
    amount: {
      value: transaction.amount,
      currency: transaction.currency,
      sign: movementDetailAmountSign(financialType),
    },
    category: financialType === 'transfer' ? undefined : movementCategory(transaction.categoryId ?? transaction.category?.id, categories),
    tags: movementTags(transaction.tags ?? []),
    items: transaction.items.map((item) => ({ ...item, currency: transaction.currency })),
    merchant: transaction.merchant,
    note: transaction.description,
    canOpenItems: transaction.items.length > 0,
    status: transaction.status === 'voided' ? 'voided' : 'posted',
    ignored: transaction.ignored === true,
    canEditCategory: financialType !== 'transfer',
    canEditTags: true,
    canToggleIgnored: financialType !== 'transfer',
    canVoid: transaction.status === 'posted',
    sharing,
    postedAtLabel: formatIsoDateTime(transaction.occurredAt),
  };
}

function mapScheduledMovement(
  movement: ScheduledMovementView,
  categories: MovementDetailCategoryOption[],
  tagOptions: MovementDetailTagOption[],
): MovementDetailViewModel {
  const financialType = movementDetailFinancialType(movement.type);
  const existingTagNames = movement.tagNames?.map((name) => ({ name })) ?? [];
  const knownTags = (movement.tagIds ?? [])
    .map((tagId) => tagOptions.find((option) => option.id === tagId))
    .filter((tag): tag is MovementDetailTagOption => Boolean(tag));
  return {
    id: movement.id,
    source: 'scheduled',
    raw: movement,
    financialType,
    title: titleFromMovement({
      merchant: movement.merchant,
      description: movement.description,
      source: 'scheduled',
      financialType,
    }),
    accountLabel: movement.accountName,
    dateLabel: formatHeroDateLabel(movement.nextDueAt ?? movement.startAt),
    amount: {
      value: movement.amount,
      currency: movement.currency,
      sign: movementDetailAmountSign(financialType),
    },
    category: financialType === 'transfer' ? undefined : movementCategory(movement.categoryId, categories),
    tags: movementTags([...existingTagNames, ...knownTags]),
    items: movement.splitItems.map((item) => ({ ...item, currency: movement.currency })),
    merchant: movement.merchant,
    note: movement.description,
    canOpenItems: movement.splitItems.length > 0,
    status: movement.status,
    lifecycleChip: 'Scheduled',
    canEditCategory: financialType !== 'transfer',
    canEditTags: true,
    canDeactivate: movement.status === 'active',
    nextDueLabel: formatIsoDate(movement.nextDueAt ?? movement.startAt),
    scheduleSummary: scheduleSummary(movement),
    originLabel: scheduledOriginLabel(movement),
    targetAccountLabel: movement.targetAccountId,
  };
}

function mapExpectedMovement(
  movement: ExpectedMovementView,
  categories: MovementDetailCategoryOption[],
): MovementDetailViewModel {
  const financialType = movementDetailFinancialType(movement.type);
  return {
    id: movement.id,
    source: 'expected',
    raw: movement,
    financialType,
    title: titleFromMovement({
      merchant: movement.merchant,
      description: movement.description,
      source: 'expected',
      financialType,
    }),
    accountLabel: movement.accountName,
    dateLabel: formatHeroDateLabel(movement.expectedAt),
    amount: {
      value: movement.amount,
      currency: movement.currency,
      sign: movementDetailAmountSign(financialType),
    },
    category: movementCategory(movement.categoryId, categories),
    tags: [],
    items: movement.splitItems.map((item) => ({ ...item, currency: movement.currency })),
    merchant: movement.merchant,
    note: movement.description,
    canOpenItems: movement.splitItems.length > 0,
    status: movement.status,
    lifecycleChip: 'Expected',
    ignored: movement.ignored === true,
    canEditCategory: true,
    canToggleIgnored: true,
    canEditExpected: movement.status === 'pending',
    canPostExpected: movement.status === 'pending',
    expectedAtLabel: formatIsoDateTime(movement.expectedAt),
    originLabel: expectedOriginLabel(movement),
  };
}

export function mapMovementDetailViewModel(input: {
  selection: MovementDetailSelection | null;
  postedItems: TransactionHistoryItemView[];
  scheduledItems: ScheduledMovementView[];
  expectedItems: ExpectedMovementView[];
  categories: MovementDetailCategoryOption[];
  tags: MovementDetailTagOption[];
  sharing: SharingDetailState;
}): MovementDetailViewModel | null {
  if (!input.selection) {
    return null;
  }
  if (input.selection.source === 'posted') {
    const transaction = input.postedItems.find((item) => item.id === input.selection?.id);
    return transaction ? mapPostedMovement(transaction, input.categories, input.sharing) : null;
  }
  if (input.selection.source === 'scheduled') {
    const movement = input.scheduledItems.find((item) => item.id === input.selection?.id);
    return movement ? mapScheduledMovement(movement, input.categories, input.tags) : null;
  }
  const movement = input.expectedItems.find((item) => item.id === input.selection?.id);
  return movement ? mapExpectedMovement(movement, input.categories) : null;
}

export function mapSharingViewModel(input: {
  participantCount: number;
  personalExpenseAmount: string;
  totalAmount: string;
  currency: string;
  participants: SharingViewModel['participants'];
}): SharingViewModel {
  return {
    participantCount: input.participantCount,
    personalExpenseAmount: input.personalExpenseAmount,
    totalAmount: input.totalAmount,
    currency: input.currency,
    participants: input.participants,
  };
}
