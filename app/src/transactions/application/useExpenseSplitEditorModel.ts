import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExpenseItemDraft, TransactionFieldErrors } from '../domain/transactions.types';
import {
  calculateSplitRemaining,
  cloneSplitItems,
  createRemainingSplitItem,
  formatSplitTotal,
  sumSplitItems,
  upsertSplitItem,
} from './transactionSplitItems';

type UseExpenseSplitEditorModelInput = {
  transactionAmount: string;
  setTransactionAmount: Dispatch<SetStateAction<string>>;
  nextId: () => string;
  setFieldErrors: Dispatch<SetStateAction<TransactionFieldErrors>>;
};

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

export function useExpenseSplitEditorModel(input: UseExpenseSplitEditorModelInput) {
  const {
    transactionAmount,
    setTransactionAmount,
    nextId,
    setFieldErrors,
  } = input;
  const [expenseDetailed, setExpenseDetailed] = useState(false);
  const [expenseItemName, setExpenseItemName] = useState('');
  const [expenseItemAmount, setExpenseItemAmount] = useState('');
  const [expenseItems, setExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [editingExpenseItemId, setEditingExpenseItemId] = useState('');

  const expenseRemaining = useMemo(
    () => calculateSplitRemaining(transactionAmount, expenseItems),
    [transactionAmount, expenseItems],
  );

  function reset() {
    setExpenseDetailed(false);
    setExpenseItemName('');
    setExpenseItemAmount('');
    setExpenseItems([]);
    setEditingExpenseItemId('');
  }

  function prefill(items: Array<{ id: string; name: string; amount: string }>) {
    setExpenseDetailed(items.length > 0);
    setExpenseItems(cloneSplitItems(items, nextId));
    setEditingExpenseItemId('');
  }

  function setExpenseDetailedValue(value: boolean) {
    setExpenseDetailed(value);
    if (!value) {
      setFieldErrors((previous) => ({
        ...previous,
        expenseItemName: undefined,
        expenseItemAmount: undefined,
        expenseSplit: undefined,
      }));
    }
  }

  function setExpenseItemNameValue(value: string) {
    setExpenseItemName(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemName: undefined }));
  }

  function setExpenseItemAmountValue(value: string) {
    setExpenseItemAmount(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemAmount: undefined }));
  }

  function syncTransactionAmountWithSplitTotal(items: ExpenseItemDraft[], mode: 'raise' | 'set') {
    const total = sumSplitItems(items);
    const normalizedTotal = formatSplitTotal(items);
    if (mode === 'set') {
      setTransactionAmount(normalizedTotal);
      return;
    }

    setTransactionAmount((previous) => {
      const current = parseAmount(previous);
      if (!previous.trim() || current < total) {
        return normalizedTotal;
      }
      return previous;
    });
  }

  function addExpenseItem() {
    const result = upsertSplitItem({
      items: expenseItems,
      editingItemId: editingExpenseItemId,
      nameInput: expenseItemName,
      amountInput: expenseItemAmount,
      nextId,
    });

    if (result.errors.expenseItemName || result.errors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...result.errors }));
      return;
    }

    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
    setExpenseItems(result.items);
    syncTransactionAmountWithSplitTotal(result.items, 'raise');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setEditingExpenseItemId('');
  }

  function editExpenseItem(itemId: string) {
    const item = expenseItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }

    setEditingExpenseItemId(item.id);
    setExpenseItemName(item.name);
    setExpenseItemAmount(item.amount);
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  function removeExpenseItem(itemId: string) {
    setExpenseItems((previous) => {
      const next = previous.filter((item) => item.id !== itemId);
      syncTransactionAmountWithSplitTotal(next, 'set');
      return next;
    });
    if (editingExpenseItemId === itemId) {
      setEditingExpenseItemId('');
      setExpenseItemName('');
      setExpenseItemAmount('');
    }
  }

  function assignRemaining() {
    const nextItem = createRemainingSplitItem({
      itemsLength: expenseItems.length,
      remaining: expenseRemaining,
      nameInput: expenseItemName,
      nextId,
    });
    if (!nextItem) {
      return;
    }

    setExpenseItems((previous) => [
      ...previous,
      nextItem,
    ]);
    setTransactionAmount((previous) => {
      const current = parseAmount(previous);
      const nextTotal = parseAmount(transactionAmount);
      if (!previous.trim() || current < nextTotal) {
        return formatAmount(nextTotal);
      }
      return previous;
    });
    setExpenseItemName('');
    setExpenseItemAmount('');
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  return {
    state: {
      expenseDetailed,
      expenseItemName,
      expenseItemAmount,
      expenseItems,
      expenseRemaining,
    },
    actions: {
      reset,
      prefill,
      setExpenseDetailedValue,
      setExpenseItemNameValue,
      setExpenseItemAmountValue,
      addExpenseItem,
      editExpenseItem,
      removeExpenseItem,
      assignRemaining,
    },
  };
}
