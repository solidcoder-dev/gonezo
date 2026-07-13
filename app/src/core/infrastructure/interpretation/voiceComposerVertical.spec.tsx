import { act, renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { SchemaGuidedInterpretationJsonCodec } from './schemaGuidedInterpretationJsonCodec';
import { useMovementComposerCoordinator } from '../../../workspace/application/useMovementComposerCoordinator';
import { InterpretationResultToMovementEntryDraftMapper } from '../../../transactions/application/MovementVoiceEntry/interpretationResultToMovementEntryDraftMapper';
import { mapMovementEntryDraftToTransactionEntryPrefill } from '../../../transactions/application/MovementVoiceEntry/mapMovementEntryDraftToTransactionEntryPrefill';
import { useTransactionEntryModel, type TransactionEntryModelClock, type TransactionEntryModelIdGenerator, type TransactionEntryModelPorts } from '../../../transactions/application/useTransactionEntryModel';

function makePorts(): TransactionEntryModelPorts {
  return {
    ledger: {
      ledgerListSupportedCurrencies: vi.fn(),
      ledgerListAccounts: vi.fn().mockResolvedValue({
        items: [
          { id: 'account-1', name: 'Checking', type: 'cash', currency: 'USD', status: 'active' },
          { id: 'account-2', name: 'Savings', type: 'cash', currency: 'EUR', status: 'active' },
        ],
      }),
      ledgerGetAccountSummary: vi.fn().mockResolvedValue({
        accountId: 'account-1',
        name: 'Checking',
        type: 'cash',
        currency: 'USD',
        balanceAmount: '100.00',
      }),
      ledgerGetNetWorthByCurrency: vi.fn().mockResolvedValue({ items: [] }),
      ledgerGetCashFlowSeries: vi.fn(),
      ledgerListTransactions: vi.fn(),
      ledgerOpenAccount: vi.fn(),
      ledgerRenameAccount: vi.fn(),
      ledgerArchiveAccount: vi.fn(),
      ledgerRestoreAccount: vi.fn(),
      ledgerDeleteAccount: vi.fn(),
      ledgerRecordExpense: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      ledgerRecordIncome: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      ledgerRecordTransfer: vi.fn().mockResolvedValue({ transferOutId: 'out-1', transferInId: 'in-1' }),
      ledgerRecordTransferFx: vi.fn().mockResolvedValue({ transferOutId: 'out-1', transferInId: 'in-1' }),
      ledgerCreateExpenseDraft: vi.fn().mockResolvedValue({ id: 'draft-1' }),
      ledgerAddTransactionItem: vi.fn().mockResolvedValue(undefined),
      ledgerPostDraftTransaction: vi.fn().mockResolvedValue(undefined),
      ledgerVoidTransaction: vi.fn(),
    },
    scheduling: {
      schedulingCreateMovement: vi.fn(),
      schedulingUpdateMovement: vi.fn(),
      schedulingDeactivateMovement: vi.fn(),
      schedulingListMovements: vi.fn(),
      movementsGetOverview: vi.fn(),
      movementsListScheduled: vi.fn(),
    },
    expected: {
      expectedCreateMovement: vi.fn(),
      expectedUpdateMovement: vi.fn(),
      expectedListMovements: vi.fn(),
      expectedResolveMovement: vi.fn().mockResolvedValue(undefined),
      expectedDismissMovement: vi.fn(),
    },
    sharing: {
      sharingListPeople: vi.fn().mockResolvedValue({ items: [] }),
      sharingApplyShareToPostedTransaction: vi.fn(),
      sharingGetMovementDetails: vi.fn(),
      sharingListMovementDetails: vi.fn(),
    },
    analytics: {
      analyticsSetMovementIgnored: vi.fn(),
    },
    taxonomy: {
      taxonomyListCategories: vi.fn().mockResolvedValue({ items: [] }),
      taxonomyCreateCategory: vi.fn().mockResolvedValue({ id: 'cat-1' }),
      taxonomyRenameCategory: vi.fn(),
      taxonomyListTags: vi.fn().mockResolvedValue({ items: [] }),
      taxonomyRenameTag: vi.fn(),
      orchestrationCategorizeTransaction: vi.fn().mockResolvedValue({ status: 'assigned' }),
      orchestrationApplyTransactionTags: vi.fn().mockResolvedValue({ status: 'assigned', tagIds: [] }),
      orchestrationListTransactionTaxonomy: vi.fn(),
    },
  };
}

function makeClock(): TransactionEntryModelClock {
  const now = new Date('2026-05-18T10:20:30.000Z');
  return {
    now: () => now,
    todayIso: () => '2026-05-18',
    resolveOccurredAt: (dateInput) => `${dateInput.trim() || '2026-05-18'}T10:20:30.000Z`,
    dayOfMonthFromDateInput: (dateInput) => dateInput.slice(8, 10).replace(/^0/, '') || '18',
    weekDayIsoFromDateInput: () => '1',
    resolveTimeZoneId: () => 'UTC',
  };
}

function makeIdGenerator(ids: string[]): TransactionEntryModelIdGenerator {
  return {
    nextId: vi.fn(() => ids.shift() ?? 'fallback-id'),
  };
}

describe('voice composer vertical flow', () => {
  it('decodes the native interpretation result, validates readiness and opens the composer', async () => {
    const fixturePath = resolve(process.cwd(), 'src/core/infrastructure/interpretation/fixtures/gonezo-movement-entry-result.v1.json');
    const fixture = readFileSync(fixturePath, 'utf8');
    const codec = new SchemaGuidedInterpretationJsonCodec();
    const mapper = new InterpretationResultToMovementEntryDraftMapper();

    const decoded = codec.decodeResult(fixture);
    const draft = mapper.map(decoded);

    const prefill = mapMovementEntryDraftToTransactionEntryPrefill(draft, {
      requestId: 42,
      defaultDate: '2026-05-18',
    });

    expect(prefill).toEqual(expect.objectContaining({
      mode: 'expense',
      amount: '5',
      date: '2026-05-18',
      note: '5 euros de gasolina 95 para mi cuenta bebobea de gasto.',
    }));

    const coordinator = renderHook(() => useMovementComposerCoordinator({ selectedAccountId: 'account-1' }));

    act(() => {
      coordinator.result.current.actions.createMovementForDraft({
        account: {
          id: 'account-1',
          name: 'Checking',
          currency: 'USD',
        },
        draft,
      });
    });

    expect(coordinator.result.current.state.transactionEntryAccountId).toBe('account-1');
    expect(coordinator.result.current.state.movementEntryType).toBe('expense');
    expect(coordinator.result.current.state.movementEntryOpenSignal).toBe(1);
    expect(coordinator.result.current.state.transactionEntryPrefill).toEqual(expect.objectContaining({
      mode: prefill.mode,
      amount: prefill.amount,
      note: prefill.note,
    }));

    const composer = renderHook(() => useTransactionEntryModel({
      ports: makePorts(),
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: coordinator.result.current.state.transactionEntryAccountId,
      enabled: true,
      prefillRequest: coordinator.result.current.state.transactionEntryPrefill,
      openSignal: coordinator.result.current.state.movementEntryOpenSignal,
      initialMode: coordinator.result.current.state.movementEntryType,
    }));

    await waitFor(() => expect(composer.result.current.required.state.open).toBe(true));

    expect(composer.result.current.required.state.sourceAccountId).toBe('account-1');
    expect(composer.result.current.required.state.mode).toBe('expense');
    expect(composer.result.current.required.state.amount).toBe('5');
    expect(composer.result.current.required.state.note).toBe('5 euros de gasolina 95 para mi cuenta bebobea de gasto.');
  });
});
