import type {
  SchedulingCreateMovementInput,
  SchedulingEndInput,
  SchedulingFrequency,
  SchedulingMonthlyPattern,
} from '../../scheduling/application/schedulingCore.port';

export type SchedulingPartsInput = {
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
  transactionDate: string;
};

export type TransferAmountPartsInput = {
  sourceAmount: string;
  sourceCurrency: string;
  targetCurrency: string;
  transferAmountIn: string;
  transferFxRate: string;
  transferFxMode: 'auto_destination' | 'auto_rate';
};

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatFxRate(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const normalized = value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return normalized || '0';
}

function dayOfMonthFromDateInput(dateInput: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return String(Number(dateInput.slice(8, 10)));
  }
  const parsed = new Date(dateInput);
  if (!Number.isNaN(parsed.getTime())) {
    return String(parsed.getUTCDate());
  }
  return String(new Date().getUTCDate());
}

function weekDayIsoFromDateInput(dateInput: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? new Date(`${dateInput}T12:00:00`)
    : new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return '1';
  }
  const day = parsed.getDay();
  return String(day === 0 ? 7 : day);
}

export function buildSchedulingParts(
  input: SchedulingPartsInput,
): Pick<SchedulingCreateMovementInput, 'rule' | 'recurrenceEnd'> {
  if (!input.recurrenceEnabled) {
    return {
      rule: {
        frequency: 'daily',
        interval: 1,
      },
      recurrenceEnd: {
        kind: 'after_occurrences',
        afterOccurrences: 1,
      },
    };
  }

  const rule: SchedulingCreateMovementInput['rule'] = {
    frequency: input.recurrenceFrequency,
    interval: Number(input.recurrenceInterval.trim()),
  };
  if (input.recurrenceFrequency === 'weekly') {
    rule.weeklyDays = [Number(input.recurrenceWeeklyDay || '1')];
  }
  if (input.recurrenceFrequency === 'monthly') {
    rule.monthlyPattern = input.recurrenceMonthlyPattern;
    if (input.recurrenceMonthlyPattern === 'day_of_month') {
      rule.dayOfMonth = Number(input.recurrenceDayOfMonth || dayOfMonthFromDateInput(input.transactionDate));
    } else {
      rule.monthlyWeekOrdinal = Number(input.recurrenceMonthlyOrdinal || '1');
      rule.monthlyWeekday = Number(input.recurrenceMonthlyWeekday || weekDayIsoFromDateInput(input.transactionDate));
    }
  }

  const recurrenceEnd: SchedulingCreateMovementInput['recurrenceEnd'] = input.recurrenceEndKind === 'on_date'
    ? { kind: 'on_date', onDate: input.recurrenceEndDate.trim() }
    : input.recurrenceEndKind === 'after_occurrences'
      ? { kind: 'after_occurrences', afterOccurrences: Number(input.recurrenceEndCount.trim()) }
      : { kind: 'never' };

  return { rule, recurrenceEnd };
}

export function buildTransferAmountParts(input: TransferAmountPartsInput): {
  amount: string;
  currency: string;
  destinationAmount?: string;
  destinationCurrency?: string;
  exchangeRate?: string;
} {
  const sourceAmountNumeric = parseAmount(input.sourceAmount);
  const amount = formatAmount(sourceAmountNumeric);
  const crossCurrency = input.targetCurrency.toUpperCase() !== input.sourceCurrency.toUpperCase();

  if (!crossCurrency) {
    return {
      amount,
      currency: input.sourceCurrency,
    };
  }

  const destinationAmountNumeric = parseAmount(input.transferAmountIn);
  const resolvedRate = input.transferFxMode === 'auto_rate'
    ? destinationAmountNumeric / sourceAmountNumeric
    : parseAmount(input.transferFxRate);

  return {
    amount,
    currency: input.sourceCurrency,
    destinationAmount: formatAmount(destinationAmountNumeric),
    destinationCurrency: input.targetCurrency,
    exchangeRate: formatFxRate(resolvedRate),
  };
}
