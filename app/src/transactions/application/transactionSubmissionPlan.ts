import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type {
  SchedulingEndInput,
  SchedulingFrequency,
  SchedulingMonthlyPattern,
} from '../../scheduling/application/scheduling.port';
import type { useLedgerTransactionCommands } from '../../ledger/application/useLedgerTransactionCommands';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { SharingGatewayPort } from '../../sharing/application/sharingGateway.port';
import type { ShareDraft } from '../../sharing/domain/shareDraft';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import type { ComposerMode, ExpenseItemDraft } from './transactions.types';
import {
  buildSchedulingParts,
  buildTransferAmountParts,
} from './transactionComposerPayloads';

type LedgerTransactionCommands = ReturnType<typeof useLedgerTransactionCommands>;

export type TransactionSubmissionClock = {
  now(): Date;
  resolveOccurredAt(dateInput: string): string;
  resolveTimeZoneId(): string;
};

export type TransactionSubmissionPlanInput = {
  ports: {
    scheduling: SchedulingGatewayPort;
    expected: ExpectedGatewayPort;
    sharing: SharingGatewayPort;
    analytics: Pick<AnalyticsPort, 'analyticsSetMovementIgnored'>;
  };
  ledgerTransactionCommands: LedgerTransactionCommands;
  clock: TransactionSubmissionClock;
  accountId: string;
  accounts: LedgerAccountItem[];
  accountCurrency: string;
  composerMode: ComposerMode;
  amount: string;
  resolvedTransactionDate: string;
  transactionNote: string;
  transferToAccountId: string;
  transferAmountIn: string;
  transferFxRate: string;
  transferFxMode: 'auto_destination' | 'auto_rate';
  schedulingMode: 'now' | 'scheduled';
  schedulingKind: 'one_shot' | 'recurring';
  recurrenceEnabled: boolean;
  recurrenceFrequency: SchedulingFrequency;
  recurrenceInterval: string;
  recurrenceWeeklyDay: string;
  recurrenceMonthlyPattern: SchedulingMonthlyPattern;
  recurrenceDayOfMonth: string;
  recurrenceMonthlyOrdinal: string;
  recurrenceMonthlyWeekday: string;
  recurrenceEndKind: SchedulingEndInput['kind'];
  recurrenceEndDate: string;
  recurrenceEndCount: string;
  movementExpected: boolean;
  movementIgnored: boolean;
  movementScheduled: boolean;
  expenseDetailed: boolean;
  expenseItems: ExpenseItemDraft[];
  editedScheduledMovementId: string;
  editedExpectedMovementId: string;
  postExpectedMovementId: string;
  shareDraft?: ShareDraft;
  resolveCategorySelection(type: TaxonomyCategoryAppliesTo): Promise<string | undefined>;
  parseTransactionTags(): string[];
  resolveTagSelectionIds(tagNames: string[]): string[];
  categorizeTransaction(
    transactionId: string,
    transactionType: TaxonomyCategoryAppliesTo,
    categoryId?: string,
  ): Promise<void>;
  applyTransactionTags(transactionId: string, tagNames: string[]): Promise<void>;
};

export type TransactionSubmissionPlanResult = {
  recorded: boolean;
  postedTransactionId: string;
};

type TransactionSubmissionContext = TransactionSubmissionPlanInput & {
  amount: string;
  occurredAt: string;
  tagNames: string[];
  tagIds: string[];
};

type TransactionSubmissionState = TransactionSubmissionPlanResult;

type TransactionSubmissionHandler = (
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) => Promise<void>;

type TransactionSubmissionHandlerEntry = {
  run: TransactionSubmissionHandler;
  runAfterRecorded?: boolean;
};

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function buildCurrentSchedulingParts(context: TransactionSubmissionContext, enabled = context.recurrenceEnabled) {
  return buildSchedulingParts({
    recurrenceEnabled: enabled,
    recurrenceFrequency: context.recurrenceFrequency,
    recurrenceInterval: context.recurrenceInterval,
    recurrenceWeeklyDay: context.recurrenceWeeklyDay,
    recurrenceMonthlyPattern: context.recurrenceMonthlyPattern,
    recurrenceDayOfMonth: context.recurrenceDayOfMonth,
    recurrenceMonthlyOrdinal: context.recurrenceMonthlyOrdinal,
    recurrenceMonthlyWeekday: context.recurrenceMonthlyWeekday,
    recurrenceEndKind: context.recurrenceEndKind,
    recurrenceEndDate: context.recurrenceEndDate,
    recurrenceEndCount: context.recurrenceEndCount,
    transactionDate: context.resolvedTransactionDate,
  });
}

function findTransferTarget(context: TransactionSubmissionContext): LedgerAccountItem {
  const transferTargetAccount = context.accounts.find((candidate) => candidate.id === context.transferToAccountId);
  if (!transferTargetAccount) {
    throw new Error('Destination account not found');
  }
  return transferTargetAccount;
}

function buildTransferAmount(context: TransactionSubmissionContext, transferTargetAccount: LedgerAccountItem) {
  return buildTransferAmountParts({
    sourceAmount: context.amount,
    sourceCurrency: context.accountCurrency,
    targetCurrency: transferTargetAccount.currency,
    transferAmountIn: context.transferAmountIn,
    transferFxRate: context.transferFxRate,
    transferFxMode: context.transferFxMode,
  });
}

async function handleEditedScheduledMovement(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (!context.editedScheduledMovementId) {
    return;
  }

  const scheduleKind = context.schedulingKind;
  const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts(context);

  if (context.composerMode === 'transfer') {
    const transferTargetAccount = findTransferTarget(context);
    const transferAmountParts = buildTransferAmount(context, transferTargetAccount);

    await context.ports.scheduling.schedulingUpdateMovement({
      recurringMovementId: context.editedScheduledMovementId,
      type: 'transfer',
      sourceAccountId: context.accountId,
      targetAccountId: context.transferToAccountId,
      amount: transferAmountParts.amount,
      currency: transferAmountParts.currency,
      destinationAmount: transferAmountParts.destinationAmount,
      destinationCurrency: transferAmountParts.destinationCurrency,
      exchangeRate: transferAmountParts.exchangeRate,
      description: context.transactionNote.trim() || undefined,
      merchant: undefined,
      categoryId: undefined,
      tagIds: context.tagIds,
      tagNames: context.tagNames,
      rule: scheduleRule,
      recurrenceEnd: scheduleEnd,
      startAt: context.occurredAt,
      zoneId: context.clock.resolveTimeZoneId(),
      scheduleKind,
    });
  }

  if (context.composerMode === 'income') {
    const categoryId = await context.resolveCategorySelection('income');
    await context.ports.scheduling.schedulingUpdateMovement({
      recurringMovementId: context.editedScheduledMovementId,
      type: 'income',
      sourceAccountId: context.accountId,
      amount: formatAmount(parseAmount(context.amount)),
      currency: context.accountCurrency,
      description: context.transactionNote.trim() || undefined,
      merchant: context.transactionNote.trim() || undefined,
      categoryId,
      splitItems: context.expenseItems,
      tagIds: context.tagIds,
      tagNames: context.tagNames,
      rule: scheduleRule,
      recurrenceEnd: scheduleEnd,
      startAt: context.occurredAt,
      zoneId: context.clock.resolveTimeZoneId(),
      scheduleKind,
    });
  }

  if (context.composerMode === 'expense') {
    const categoryId = await context.resolveCategorySelection('expense');
    await context.ports.scheduling.schedulingUpdateMovement({
      recurringMovementId: context.editedScheduledMovementId,
      type: 'expense',
      sourceAccountId: context.accountId,
      amount: formatAmount(parseAmount(context.amount)),
      currency: context.accountCurrency,
      description: context.transactionNote.trim() || undefined,
      merchant: context.transactionNote.trim() || undefined,
      categoryId,
      splitItems: context.expenseItems,
      tagIds: context.tagIds,
      tagNames: context.tagNames,
      rule: scheduleRule,
      recurrenceEnd: scheduleEnd,
      startAt: context.occurredAt,
      zoneId: context.clock.resolveTimeZoneId(),
      scheduleKind,
    });
  }

  state.recorded = true;
}

async function handleExpectedMovement(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (
    !context.movementExpected
    || context.recurrenceEnabled
    || (context.composerMode !== 'expense' && context.composerMode !== 'income')
  ) {
    return;
  }

  const categoryId = await context.resolveCategorySelection(context.composerMode);
  const expectedPayload = {
    accountId: context.accountId,
    type: context.composerMode,
    amount: formatAmount(parseAmount(context.amount)),
    currency: context.accountCurrency,
    expectedAt: context.occurredAt,
    description: context.transactionNote.trim() || undefined,
    merchant: context.transactionNote.trim() || undefined,
    categoryId,
    ignored: context.movementIgnored,
    splitItems: context.expenseItems,
  };
  if (context.editedExpectedMovementId) {
    await context.ports.expected.expectedUpdateMovement({
      expectedMovementId: context.editedExpectedMovementId,
      ...expectedPayload,
    });
  } else {
    await context.ports.expected.expectedCreateMovement(expectedPayload);
  }
  state.recorded = true;
}

async function handleRecurringIncomeExpense(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (
    context.editedScheduledMovementId
    || (context.composerMode !== 'expense' && context.composerMode !== 'income')
    || !context.recurrenceEnabled
  ) {
    return;
  }

  const categoryId = await context.resolveCategorySelection(context.composerMode);
  const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts(context, true);

  await context.ports.scheduling.schedulingCreateMovement({
    type: context.composerMode,
    sourceAccountId: context.accountId,
    amount: formatAmount(parseAmount(context.amount)),
    currency: context.accountCurrency,
    description: context.transactionNote.trim() || undefined,
    merchant: context.transactionNote.trim() || undefined,
    categoryId,
    splitItems: context.expenseItems,
    tagIds: context.tagIds,
    tagNames: context.tagNames,
    rule: scheduleRule,
    recurrenceEnd: scheduleEnd,
    startAt: context.occurredAt,
    zoneId: context.clock.resolveTimeZoneId(),
    scheduleKind: 'recurring',
    reviewPolicy: context.movementExpected ? 'require_user_confirmation' : 'automatic',
  });
  state.recorded = true;
}

async function handleOneShotIncomeExpense(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (
    (context.composerMode !== 'expense' && context.composerMode !== 'income')
    || !context.movementScheduled
  ) {
    return;
  }

  const categoryId = await context.resolveCategorySelection(context.composerMode);
  const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts(context, false);
  await context.ports.scheduling.schedulingCreateMovement({
    type: context.composerMode,
    sourceAccountId: context.accountId,
    amount: formatAmount(parseAmount(context.amount)),
    currency: context.accountCurrency,
    description: context.transactionNote.trim() || undefined,
    merchant: context.transactionNote.trim() || undefined,
    categoryId,
    tagIds: context.tagIds,
    tagNames: context.tagNames,
    rule: scheduleRule,
    recurrenceEnd: scheduleEnd,
    startAt: context.occurredAt,
    zoneId: context.clock.resolveTimeZoneId(),
    scheduleKind: 'one_shot',
  });
  state.recorded = true;
}

async function handleScheduledNonExpense(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (context.composerMode === 'expense' || context.schedulingMode !== 'scheduled') {
    return;
  }

  const categoryId = context.composerMode === 'income'
    ? await context.resolveCategorySelection('income')
    : undefined;
  const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts(context);

  if (context.composerMode === 'transfer') {
    const transferTargetAccount = findTransferTarget(context);
    const transferAmountParts = buildTransferAmount(context, transferTargetAccount);

    await context.ports.scheduling.schedulingCreateMovement({
      type: 'transfer',
      sourceAccountId: context.accountId,
      targetAccountId: context.transferToAccountId,
      amount: transferAmountParts.amount,
      currency: transferAmountParts.currency,
      destinationAmount: transferAmountParts.destinationAmount,
      destinationCurrency: transferAmountParts.destinationCurrency,
      exchangeRate: transferAmountParts.exchangeRate,
      description: context.transactionNote.trim() || undefined,
      merchant: undefined,
      categoryId: undefined,
      tagIds: context.tagIds,
      tagNames: context.tagNames,
      rule: scheduleRule,
      recurrenceEnd: scheduleEnd,
      startAt: context.occurredAt,
      zoneId: context.clock.resolveTimeZoneId(),
      scheduleKind: context.schedulingKind,
    });
  }

  if (context.composerMode === 'income') {
    await context.ports.scheduling.schedulingCreateMovement({
      type: 'income',
      sourceAccountId: context.accountId,
      amount: formatAmount(parseAmount(context.amount)),
      currency: context.accountCurrency,
      description: context.transactionNote.trim() || undefined,
      merchant: context.transactionNote.trim() || undefined,
      categoryId,
      splitItems: context.expenseItems,
      tagIds: context.tagIds,
      tagNames: context.tagNames,
      rule: scheduleRule,
      recurrenceEnd: scheduleEnd,
      startAt: context.occurredAt,
      zoneId: context.clock.resolveTimeZoneId(),
      scheduleKind: context.schedulingKind,
    });
  }
  state.recorded = true;
}

async function handlePostedExpense(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (context.composerMode !== 'expense') {
    return;
  }

  const categoryId = await context.resolveCategorySelection('expense');
  if (!context.expenseDetailed) {
    const result = await context.ledgerTransactionCommands.recordExpense({
      accountId: context.accountId,
      occurredAt: context.occurredAt,
      amount: context.amount,
      currency: context.accountCurrency,
      description: context.transactionNote.trim() || undefined,
      merchant: context.transactionNote.trim() || undefined,
      categoryId,
    });
    state.postedTransactionId = result.id;
    await context.categorizeTransaction(result.id, 'expense', categoryId);
    await context.applyTransactionTags(result.id, context.tagNames);
    state.recorded = true;
    return;
  }

  const draft = await context.ledgerTransactionCommands.createExpenseDraft({
    accountId: context.accountId,
    occurredAt: context.occurredAt,
    amount: context.amount,
    currency: context.accountCurrency,
    description: context.transactionNote.trim() || undefined,
    merchant: context.transactionNote.trim() || undefined,
  });

  for (const item of context.expenseItems) {
    await context.ledgerTransactionCommands.addTransactionItem({
      transactionId: draft.id,
      name: item.name,
      amount: item.amount,
      currency: context.accountCurrency,
    });
  }

  await context.ledgerTransactionCommands.postDraftTransaction({ transactionId: draft.id });
  state.postedTransactionId = draft.id;
  await context.categorizeTransaction(draft.id, 'expense', categoryId);
  await context.applyTransactionTags(draft.id, context.tagNames);
  state.recorded = true;
}

async function handlePostedIncome(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (context.composerMode !== 'income') {
    return;
  }

  const categoryId = await context.resolveCategorySelection('income');
  if (!context.expenseDetailed) {
    const result = await context.ledgerTransactionCommands.recordIncome({
      accountId: context.accountId,
      occurredAt: context.occurredAt,
      amount: context.amount,
      currency: context.accountCurrency,
      description: context.transactionNote.trim() || undefined,
      merchant: context.transactionNote.trim() || undefined,
      categoryId,
    });
    state.postedTransactionId = result.id;
    await context.categorizeTransaction(result.id, 'income', categoryId);
    await context.applyTransactionTags(result.id, context.tagNames);
    state.recorded = true;
    return;
  }

  const draft = await context.ledgerTransactionCommands.createExpenseDraft({
    accountId: context.accountId,
    occurredAt: context.occurredAt,
    amount: context.amount,
    currency: context.accountCurrency,
    type: 'income',
    description: context.transactionNote.trim() || undefined,
    merchant: context.transactionNote.trim() || undefined,
  });

  for (const item of context.expenseItems) {
    await context.ledgerTransactionCommands.addTransactionItem({
      transactionId: draft.id,
      name: item.name,
      amount: item.amount,
      currency: context.accountCurrency,
    });
  }

  await context.ledgerTransactionCommands.postDraftTransaction({ transactionId: draft.id });
  state.postedTransactionId = draft.id;
  await context.categorizeTransaction(draft.id, 'income', categoryId);
  await context.applyTransactionTags(draft.id, context.tagNames);
  state.recorded = true;
}

async function handlePostedTransfer(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (context.schedulingMode !== 'now' || context.composerMode !== 'transfer') {
    return;
  }

  const transferTargetAccount = findTransferTarget(context);
  const transferAmountParts = buildTransferAmount(context, transferTargetAccount);

  let result: { transferOutId: string; transferInId: string };

  if (!transferAmountParts.destinationAmount || !transferAmountParts.destinationCurrency) {
    result = await context.ledgerTransactionCommands.recordTransfer({
      fromAccountId: context.accountId,
      toAccountId: context.transferToAccountId,
      occurredAt: context.occurredAt,
      amount: transferAmountParts.amount,
      currency: transferAmountParts.currency,
      description: context.transactionNote.trim() || undefined,
    });
  } else {
    result = await context.ledgerTransactionCommands.recordTransferFx({
      fromAccountId: context.accountId,
      toAccountId: context.transferToAccountId,
      occurredAt: context.occurredAt,
      sourceAmount: transferAmountParts.amount,
      sourceCurrency: transferAmountParts.currency,
      destinationAmount: transferAmountParts.destinationAmount,
      destinationCurrency: transferAmountParts.destinationCurrency,
      exchangeRate: transferAmountParts.exchangeRate,
      description: context.transactionNote.trim() || undefined,
    });
  }

  await context.applyTransactionTags(result.transferOutId, context.tagNames);
  await context.applyTransactionTags(result.transferInId, context.tagNames);
  state.recorded = true;
}

async function handlePostedShare(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (
    context.composerMode !== 'expense'
    || !state.postedTransactionId
    || !context.shareDraft
  ) {
    return;
  }

  const participants = context.shareDraft.people
    .filter((person) => person.id !== 'you')
    .map((person) => ({
      personName: person.name,
      amount: formatAmount(parseAmount(person.amount)),
      reimbursable: person.reimbursable,
    }))
    .filter((person) => parseAmount(person.amount) > 0);

  if (participants.length === 0) {
    return;
  }

  await context.ports.sharing.sharingApplyShareToPostedTransaction({
    transactionId: state.postedTransactionId,
    payerName: 'You',
    participants,
    appliedAt: context.clock.now().toISOString(),
  });
}

async function handlePostedMovementIgnored(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (
    !context.movementIgnored
    || !state.postedTransactionId
    || (context.composerMode !== 'expense' && context.composerMode !== 'income')
  ) {
    return;
  }

  await context.ports.analytics.analyticsSetMovementIgnored({
    movementId: state.postedTransactionId,
    ignored: true,
    changedAt: context.clock.now().toISOString(),
  });
}

const SUBMISSION_HANDLERS: TransactionSubmissionHandlerEntry[] = [
  { run: handleEditedScheduledMovement },
  { run: handleExpectedMovement, runAfterRecorded: true },
  { run: handleRecurringIncomeExpense, runAfterRecorded: true },
  { run: handleOneShotIncomeExpense },
  { run: handleScheduledNonExpense },
  { run: handlePostedExpense },
  { run: handlePostedIncome },
  { run: handlePostedTransfer },
  { run: handlePostedMovementIgnored, runAfterRecorded: true },
  { run: handlePostedShare, runAfterRecorded: true },
];

async function resolvePostedExpectedMovement(
  context: TransactionSubmissionContext,
  state: TransactionSubmissionState,
) {
  if (!state.recorded || !state.postedTransactionId) {
    return;
  }

  if (context.editedExpectedMovementId) {
    await context.ports.expected.expectedResolveMovement({
      expectedMovementId: context.editedExpectedMovementId,
      transactionId: state.postedTransactionId,
      resolvedAt: context.clock.now().toISOString(),
    });
    return;
  }

  if (context.postExpectedMovementId) {
    await context.ports.expected.expectedResolveMovement({
      expectedMovementId: context.postExpectedMovementId,
      transactionId: state.postedTransactionId,
      resolvedAt: context.clock.now().toISOString(),
    });
  }
}

export async function runTransactionSubmissionPlan(
  input: TransactionSubmissionPlanInput,
): Promise<TransactionSubmissionPlanResult> {
  const tagNames = input.parseTransactionTags();
  const context: TransactionSubmissionContext = {
    ...input,
    amount: input.amount.trim(),
    occurredAt: input.clock.resolveOccurredAt(input.resolvedTransactionDate),
    tagNames,
    tagIds: input.resolveTagSelectionIds(tagNames),
  };

  const state: TransactionSubmissionState = {
    recorded: false,
    postedTransactionId: '',
  };

  for (const handler of SUBMISSION_HANDLERS) {
    if (state.recorded && !handler.runAfterRecorded) {
      continue;
    }
    await handler.run(context, state);
  }

  await resolvePostedExpectedMovement(context, state);
  return state;
}
