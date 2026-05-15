import { describe, expect, it } from 'vitest';
import {
  buildSchedulingParts,
  buildTransferAmountParts,
} from './transactionComposerPayloads';

describe('transaction composer payload builders', () => {
  it('builds recurring weekly scheduling parts', () => {
    const parts = buildSchedulingParts({
      recurrenceEnabled: true,
      recurrenceFrequency: 'weekly',
      recurrenceInterval: '2',
      recurrenceWeeklyDay: '5',
      recurrenceMonthlyPattern: 'day_of_month',
      recurrenceDayOfMonth: '10',
      recurrenceMonthlyOrdinal: '1',
      recurrenceMonthlyWeekday: '1',
      recurrenceEndKind: 'after_occurrences',
      recurrenceEndDate: '',
      recurrenceEndCount: '4',
      transactionDate: '2026-05-14',
    });

    expect(parts).toEqual({
      rule: {
        frequency: 'weekly',
        interval: 2,
        weeklyDays: [5],
      },
      recurrenceEnd: {
        kind: 'after_occurrences',
        afterOccurrences: 4,
      },
    });
  });

  it('builds monthly nth weekday scheduling parts with date fallback', () => {
    const parts = buildSchedulingParts({
      recurrenceEnabled: true,
      recurrenceFrequency: 'monthly',
      recurrenceInterval: '1',
      recurrenceWeeklyDay: '',
      recurrenceMonthlyPattern: 'nth_weekday',
      recurrenceDayOfMonth: '',
      recurrenceMonthlyOrdinal: '2',
      recurrenceMonthlyWeekday: '',
      recurrenceEndKind: 'on_date',
      recurrenceEndDate: '2026-12-31',
      recurrenceEndCount: '',
      transactionDate: '2026-05-13',
    });

    expect(parts).toEqual({
      rule: {
        frequency: 'monthly',
        interval: 1,
        monthlyPattern: 'nth_weekday',
        monthlyWeekOrdinal: 2,
        monthlyWeekday: 3,
      },
      recurrenceEnd: {
        kind: 'on_date',
        onDate: '2026-12-31',
      },
    });
  });

  it('builds one-shot scheduling parts when recurrence is disabled', () => {
    expect(buildSchedulingParts({
      recurrenceEnabled: false,
      recurrenceFrequency: 'monthly',
      recurrenceInterval: '1',
      recurrenceWeeklyDay: '',
      recurrenceMonthlyPattern: 'day_of_month',
      recurrenceDayOfMonth: '',
      recurrenceMonthlyOrdinal: '',
      recurrenceMonthlyWeekday: '',
      recurrenceEndKind: 'never',
      recurrenceEndDate: '',
      recurrenceEndCount: '',
      transactionDate: '2026-05-14',
    })).toEqual({
      rule: {
        frequency: 'daily',
        interval: 1,
      },
      recurrenceEnd: {
        kind: 'after_occurrences',
        afterOccurrences: 1,
      },
    });
  });

  it('builds same-currency transfer amount parts', () => {
    expect(buildTransferAmountParts({
      sourceAmount: '12',
      sourceCurrency: 'USD',
      targetCurrency: 'USD',
      transferAmountIn: '',
      transferFxRate: '',
      transferFxMode: 'auto_destination',
    })).toEqual({
      amount: '12.00',
      currency: 'USD',
    });
  });

  it('builds cross-currency transfer amount parts', () => {
    expect(buildTransferAmountParts({
      sourceAmount: '100',
      sourceCurrency: 'USD',
      targetCurrency: 'EUR',
      transferAmountIn: '85',
      transferFxRate: '',
      transferFxMode: 'auto_rate',
    })).toEqual({
      amount: '100.00',
      currency: 'USD',
      destinationAmount: '85.00',
      destinationCurrency: 'EUR',
      exchangeRate: '0.85',
    });
  });
});
