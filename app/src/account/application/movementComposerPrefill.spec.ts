import { describe, expect, it } from 'vitest';
import type { ExpectedMovementView, ScheduledMovementView } from '../../movements/application/movementsView.types';
import {
  expectedMovementToComposerPrefill,
  postExpectedMovementToComposerPrefill,
  scheduledMovementToComposerPrefill,
} from './movementComposerPrefill';

const baseExpectedMovement: ExpectedMovementView = {
  id: 'expected-1',
  accountId: 'account-1',
  type: 'expense',
  amount: '12.50',
  currency: 'EUR',
  expectedAt: '2026-05-20T10:15:00.000Z',
  description: 'Groceries',
  merchant: 'Market',
  categoryId: 'cat-food',
  splitItems: [{ id: 'item-1', name: 'Fruit', amount: '12.50' }],
  status: 'pending',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  origin: { kind: 'manual' },
};

const baseScheduledMovement: ScheduledMovementView = {
  id: 'scheduled-1',
  type: 'transfer',
  sourceAccountId: 'account-1',
  targetAccountId: 'account-2',
  amount: '90.00',
  currency: 'EUR',
  destinationAmount: '100.00',
  destinationCurrency: 'USD',
  exchangeRate: '1.111111',
  description: 'Monthly saving',
  merchant: undefined,
  status: 'active',
  startAt: '2026-05-25T08:00:00.000Z',
  nextDueAt: '2026-05-25T08:00:00.000Z',
  zoneId: 'Atlantic/Canary',
  generatedOccurrences: 0,
  splitItems: [],
  rule: {
    frequency: 'monthly',
    interval: 1,
    monthlyPattern: 'day_of_month',
    dayOfMonth: 25,
  },
  recurrenceEnd: {
    kind: 'after_occurrences',
    afterOccurrences: 6,
  },
  scheduleKind: 'recurring',
};

describe('movementComposerPrefill', () => {
  it('maps an expected movement edit into a composer prefill', () => {
    expect(expectedMovementToComposerPrefill(baseExpectedMovement, 'Food', 123)).toEqual({
      requestId: 123,
      editedExpectedMovementId: 'expected-1',
      mode: 'expense',
      amount: '12.50',
      date: '2026-05-20',
      note: 'Market',
      categoryId: 'cat-food',
      splitItems: [{ id: 'item-1', name: 'Fruit', amount: '12.50' }],
    });
  });

  it('maps an expected movement post into a composer prefill', () => {
    expect(postExpectedMovementToComposerPrefill({ ...baseExpectedMovement, ignored: true }, undefined, 456)).toMatchObject({
      requestId: 456,
      postExpectedMovementId: 'expected-1',
      mode: 'expense',
      categoryId: 'cat-food',
      movementIgnored: true,
    });
  });

  it('maps a scheduled movement edit into a composer prefill', () => {
    expect(scheduledMovementToComposerPrefill(baseScheduledMovement, undefined, 789)).toEqual({
      requestId: 789,
      editedScheduledMovementId: 'scheduled-1',
      mode: 'transfer',
      amount: '90.00',
      date: '2026-05-25',
      note: 'Monthly saving',
      categoryId: undefined,
      splitItems: [],
      transferTargetAccountId: 'account-2',
      transferAmountIn: '100.00',
      transferFxRate: '1.111111',
      transferFxMode: 'auto_destination',
      transferDestinationCurrency: 'USD',
      schedulingMode: 'scheduled',
      schedulingKind: 'recurring',
      recurrenceFrequency: 'monthly',
      recurrenceInterval: '1',
      recurrenceWeeklyDay: '1',
      recurrenceMonthlyPattern: 'day_of_month',
      recurrenceDayOfMonth: '25',
      recurrenceMonthlyOrdinal: '1',
      recurrenceMonthlyWeekday: '1',
      recurrenceEndKind: 'after_occurrences',
      recurrenceEndDate: '',
      recurrenceEndCount: '6',
    });
  });
});
