import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TransactionEntryModelPorts } from './useTransactionEntryModel';
import { useTransactionEntryModel } from './useTransactionEntryModel';

function makePorts(): TransactionEntryModelPorts {
  return {
    ledger: {
      ledgerListSupportedCurrencies: vi.fn(),
      ledgerListAccounts: vi.fn(),
      ledgerGetAccountSummary: vi.fn(),
      ledgerListTransactions: vi.fn(),
      ledgerOpenAccount: vi.fn(),
      ledgerRenameAccount: vi.fn(),
      ledgerArchiveAccount: vi.fn(),
      ledgerRestoreAccount: vi.fn(),
      ledgerDeleteAccount: vi.fn(),
      ledgerRecordExpense: vi.fn(),
      ledgerRecordIncome: vi.fn(),
      ledgerRecordTransfer: vi.fn(),
      ledgerRecordTransferFx: vi.fn(),
      ledgerCreateExpenseDraft: vi.fn(),
      ledgerAddTransactionItem: vi.fn(),
      ledgerPostDraftTransaction: vi.fn(),
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
      expectedResolveMovement: vi.fn(),
      expectedDismissMovement: vi.fn(),
    },
    taxonomy: {
      taxonomyListCategories: vi.fn(),
      taxonomyCreateCategory: vi.fn(),
      taxonomyRenameCategory: vi.fn(),
      taxonomyListTags: vi.fn(),
      taxonomyRenameTag: vi.fn(),
      orchestrationCategorizeTransaction: vi.fn(),
      orchestrationApplyTransactionTags: vi.fn(),
      orchestrationListTransactionTaxonomy: vi.fn(),
    },
  };
}

describe('useTransactionEntryModel', () => {
  it('accepts injected ports and stays idle when disabled', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      accountId: null,
      enabled: false,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    expect(result.current.error).toBe('');
    expect(ports.ledger.ledgerListAccounts).not.toHaveBeenCalled();
    expect(ports.taxonomy.taxonomyListCategories).not.toHaveBeenCalled();
  });
});
