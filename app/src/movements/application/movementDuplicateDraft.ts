import type { ShareDraft } from '../../sharing/domain/shareDraft';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';
import type { MovementDetailViewModel } from './movementDetailView.types';

export type DuplicateMovementDraft = Omit<TransactionEntryPrefillRequest, 'requestId'>;

function toDateInputValue(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function copySplitItems(items: Array<{ id: string; name: string; amount: string }>) {
  return items.map(({ name, amount }) => ({ name, amount }));
}

function shareDraftFromDetail(movement: Extract<MovementDetailViewModel, { source: 'posted' }>): ShareDraft | undefined {
  if (movement.sharing.phase !== 'loaded' || !movement.sharing.value) {
    return undefined;
  }
  return {
    mode: 'amounts',
    people: [
      { id: 'you', name: 'You (Payer)', reimbursable: false, parts: 1, amount: movement.sharing.value.personalExpenseAmount, avatarTone: 'you' },
      ...movement.sharing.value.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        reimbursable: participant.reimbursementStatus !== 'dismissed',
        parts: 1,
        amount: participant.amount,
        avatarTone: 'custom' as const,
      })),
    ],
  };
}

function copyPostedMovement(movement: Extract<MovementDetailViewModel, { source: 'posted' }>): DuplicateMovementDraft {
  const source = movement.raw;
  const draft: DuplicateMovementDraft = {
    initialIntent: 'now', mode: movement.financialType === 'transfer' ? 'transfer' : movement.financialType,
    amount: source.amount, date: toDateInputValue(source.occurredAt), note: source.description,
    categoryId: source.categoryId ?? source.category?.id, tagNames: movement.tags.map((tag) => tag.name),
    movementIgnored: source.ignored, splitItems: copySplitItems(source.items), shareDraft: shareDraftFromDetail(movement),
  };
  if (movement.financialType === 'transfer') {
    draft.transferTargetAccountId = source.targetAccountId;
    draft.transferAmountIn = source.destinationAmount;
    draft.transferDestinationCurrency = source.destinationCurrency;
    draft.transferFxRate = source.exchangeRate;
    draft.transferFxMode = source.destinationAmount ? 'auto_destination' : 'auto_rate';
  }
  return draft;
}

function recurrencePrefill(movement: Extract<MovementDetailViewModel, { source: 'scheduled' }>): Pick<TransactionEntryPrefillRequest, 'schedulingMode' | 'schedulingKind' | 'recurrenceFrequency' | 'recurrenceInterval' | 'recurrenceWeeklyDay' | 'recurrenceMonthlyPattern' | 'recurrenceDayOfMonth' | 'recurrenceMonthlyOrdinal' | 'recurrenceMonthlyWeekday' | 'recurrenceEndKind' | 'recurrenceEndDate' | 'recurrenceEndCount'> {
  const { rule, recurrenceEnd } = movement.raw;
  return {
    schedulingMode: 'scheduled', schedulingKind: movement.raw.scheduleKind ?? movement.raw.origin ?? 'recurring',
    recurrenceFrequency: rule.frequency, recurrenceInterval: String(rule.interval ?? 1),
    recurrenceWeeklyDay: String(rule.weeklyDays?.[0] ?? 1), recurrenceMonthlyPattern: rule.monthlyPattern,
    recurrenceDayOfMonth: String(rule.dayOfMonth ?? 1), recurrenceMonthlyOrdinal: String(rule.monthlyWeekOrdinal ?? 1),
    recurrenceMonthlyWeekday: String(rule.monthlyWeekday ?? 1), recurrenceEndKind: recurrenceEnd.kind,
    recurrenceEndDate: recurrenceEnd.kind === 'on_date' ? recurrenceEnd.onDate : '',
    recurrenceEndCount: recurrenceEnd.kind === 'after_occurrences' ? String(recurrenceEnd.afterOccurrences ?? 1) : '',
  };
}

function copyScheduledMovement(movement: Extract<MovementDetailViewModel, { source: 'scheduled' }>): DuplicateMovementDraft {
  const source = movement.raw;
  return {
    initialIntent: 'scheduled', mode: movement.financialType === 'transfer' ? 'transfer' : movement.financialType,
    amount: source.amount, date: toDateInputValue(source.nextDueAt ?? source.startAt), note: source.description,
    categoryId: source.categoryId, tagNames: movement.tags.map((tag) => tag.name), splitItems: copySplitItems(source.splitItems),
    transferTargetAccountId: source.targetAccountId, transferAmountIn: source.destinationAmount, transferFxRate: source.exchangeRate,
    transferFxMode: source.destinationAmount ? 'auto_destination' : 'auto_rate', transferDestinationCurrency: source.destinationCurrency,
    ...recurrencePrefill(movement),
  };
}

function copyExpectedMovement(movement: Extract<MovementDetailViewModel, { source: 'expected' }>): DuplicateMovementDraft {
  const source = movement.raw;
  const series = movement.recurringSchedule;
  return {
    initialIntent: 'expected', mode: movement.financialType === 'transfer' ? 'transfer' : movement.financialType,
    amount: source.amount, date: toDateInputValue(source.expectedAt), note: source.description,
    categoryId: source.categoryId, movementIgnored: source.ignored, splitItems: copySplitItems(source.splitItems),
    ...(series ? {
      recurrenceFrequency: series.rule.frequency,
      recurrenceInterval: String(series.rule.interval ?? 1),
      recurrenceWeeklyDay: String(series.rule.weeklyDays?.[0] ?? 1),
      recurrenceMonthlyPattern: series.rule.monthlyPattern,
      recurrenceDayOfMonth: String(series.rule.dayOfMonth ?? 1),
      recurrenceMonthlyOrdinal: String(series.rule.monthlyWeekOrdinal ?? 1),
      recurrenceMonthlyWeekday: String(series.rule.monthlyWeekday ?? 1),
      recurrenceEndKind: series.recurrenceEnd.kind,
      recurrenceEndDate: series.recurrenceEnd.kind === 'on_date' ? series.recurrenceEnd.onDate : '',
      recurrenceEndCount: series.recurrenceEnd.kind === 'after_occurrences' ? String(series.recurrenceEnd.afterOccurrences ?? 1) : '',
    } : {}),
    schedulingMode: undefined, schedulingKind: undefined,
  };
}

export function createDraftFromMovementDetail(detail: MovementDetailViewModel): DuplicateMovementDraft {
  if (detail.source === 'posted') return copyPostedMovement(detail);
  if (detail.source === 'scheduled') return copyScheduledMovement(detail);
  return copyExpectedMovement(detail);
}
