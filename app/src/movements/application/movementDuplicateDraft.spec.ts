import { describe, expect, it } from 'vitest';
import type { ShareDraft } from '../../sharing/domain/shareDraft';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { MovementDetailViewModel } from './movementDetailView.types';
import { createDraftFromMovementDetail } from './movementDuplicateDraft';

const posted = (overrides: Partial<TransactionHistoryItemView> = {}): MovementDetailViewModel => ({
  source: 'posted',
  id: 'transaction-1',
  raw: {
    id: 'transaction-1', accountId: 'account-1', type: 'expense', amount: '25.00', currency: 'EUR',
    occurredAt: '2026-08-20T10:00:00.000Z', status: 'posted', description: 'Lunch', merchant: 'Cafe',
    categoryId: 'category-1', tags: [{ id: 'tag-1', name: 'Food' }], ignored: true, items: [{ id: 'item-1', name: 'Meal', amount: '25.00' }], ...overrides,
  }, financialType: 'expense', title: 'Cafe', dateLabel: '', amount: { value: '25.00', currency: 'EUR', sign: '-' },
  category: { id: 'category-1', name: 'Food' }, items: [{ id: 'item-1', name: 'Meal', amount: '25.00' }],
  merchant: 'Cafe', note: 'Lunch', canOpenItems: true, status: 'posted', tags: [{ id: 'tag-1', name: 'Food' }],
  ignored: true, canEditCategory: true, canEditTags: true, canToggleIgnored: true, canVoid: true,
  sharing: { phase: 'idle' }, postedAtLabel: '',
  duplicateReadiness: 'ready',
});

describe('createDraftFromMovementDetail', () => {
  it('copies editable posted values without lifecycle or identity', () => {
    const draft = createDraftFromMovementDetail(posted());
    expect(draft).toMatchObject({ mode: 'expense', initialIntent: 'now', amount: '25.00', date: '2026-08-20', note: 'Lunch', categoryId: 'category-1', tagNames: ['Food'], movementIgnored: true });
    expect(draft.splitItems).toEqual([{ name: 'Meal', amount: '25.00' }]);
    expect(draft).not.toHaveProperty('transactionId');
    expect(draft).not.toHaveProperty('editedExpectedMovementId');
    expect(draft).not.toHaveProperty('editedScheduledMovementId');
    expect(draft.splitItems).not.toBe((posted().raw as TransactionHistoryItemView).items);
  });

  it('rebuilds a posted transfer from its complete read model without copying identity or lifecycle', () => {
    const detail = posted({
      type: 'transfer_out',
      accountId: 'source-account',
      amount: '100.00',
      currency: 'GBP',
      linkedTransactionId: 'posted-transfer-in',
      targetAccountId: 'target-account',
      destinationAmount: '125.00',
      destinationCurrency: 'EUR',
      exchangeRate: '1.25',
      status: 'voided',
    } as unknown as Partial<TransactionHistoryItemView>);
    detail.financialType = 'transfer';

    expect(createDraftFromMovementDetail(detail)).toMatchObject({
      mode: 'transfer',
      initialIntent: 'now',
      transferTargetAccountId: 'target-account',
      amount: '100.00',
      transferAmountIn: '125.00',
      transferDestinationCurrency: 'EUR',
      transferFxRate: '1.25',
      note: 'Lunch',
      categoryId: 'category-1',
      tagNames: ['Food'],
    });
    const draft = createDraftFromMovementDetail(detail);
    expect(draft).not.toHaveProperty('transactionId');
    expect(draft).not.toHaveProperty('linkedTransactionId');
    expect(draft).not.toHaveProperty('status');
    expect(draft).not.toHaveProperty('occurredAt');
  });

  it('is deterministic for the same detail', () => {
    const first = createDraftFromMovementDetail(posted());
    const second = createDraftFromMovementDetail(posted());
    expect(second).toEqual(first);
  });

  it('preserves expected intent, including resolved and dismissed occurrences', () => {
    const source = posted().raw as TransactionHistoryItemView;
    const detail = { ...posted(), source: 'expected', id: 'expected-1', raw: { ...source, id: 'expected-1', expectedAt: '2026-08-20T10:00:00.000Z', splitItems: source.items }, items: source.items, series: { kind: 'manual' } } as unknown as MovementDetailViewModel;
    expect(createDraftFromMovementDetail(detail)).toMatchObject({ initialIntent: 'expected' });
  });

  it('copies scheduled recurrence but never the original series identity', () => {
    const detail = { ...posted(), source: 'scheduled', id: 'series-1', raw: {
      id: 'series-1', type: 'expense', sourceAccountId: 'account-1', amount: '25.00', currency: 'EUR', status: 'inactive',
      startAt: '2026-08-20T00:00:00.000Z', zoneId: 'UTC', generatedOccurrences: 1, splitItems: [],
      rule: { frequency: 'weekly', interval: 2, weeklyDays: [3] }, recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 4 },
    }, tags: [] } as unknown as MovementDetailViewModel;
    const draft = createDraftFromMovementDetail(detail);
    expect(draft).toMatchObject({ initialIntent: 'scheduled', schedulingMode: 'scheduled', recurrenceFrequency: 'weekly', recurrenceInterval: '2', recurrenceWeeklyDay: '3', recurrenceEndKind: 'after_occurrences', recurrenceEndCount: '4' });
    expect(draft).not.toHaveProperty('editedScheduledMovementId');
    expect(draft).not.toHaveProperty('recurringMovementId');
  });

  it('rebuilds sharing as an independent draft when the detail has it', () => {
    const detail = { ...posted(), sharing: { phase: 'loaded' as const, value: {
      participantCount: 1, personalExpenseAmount: '10.00', totalAmount: '25.00', currency: 'EUR',
      participants: [{ id: 'person-1', name: 'Alex', amount: '15.00', reimbursementStatus: 'pending' as const }],
    } } };
    const draft = createDraftFromMovementDetail(detail);
    expect(draft.shareDraft).toEqual<ShareDraft>({ mode: 'amounts', people: [
      { id: 'you', name: 'You (Payer)', reimbursable: false, parts: 1, amount: '10.00', avatarTone: 'you' },
      { id: 'person-1', name: 'Alex', reimbursable: true, parts: 1, amount: '15.00', avatarTone: 'custom' },
    ] });
  });
});
