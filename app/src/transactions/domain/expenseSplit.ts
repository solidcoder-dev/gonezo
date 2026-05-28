export type ExpenseItemDraft = {
  id: string;
  name: string;
  amount: string;
};

export type ExpenseSplitFieldErrors = {
  expenseItemName?: string;
  expenseItemAmount?: string;
};

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

export function cloneSplitItems(
  items: Array<{ id: string; name: string; amount: string }>,
  nextId: () => string,
): ExpenseItemDraft[] {
  return items.map((item) => ({
    id: nextId(),
    name: item.name,
    amount: item.amount,
  }));
}

export function sumSplitItems(items: ExpenseItemDraft[]): number {
  return items.reduce((acc, item) => acc + parseAmount(item.amount), 0);
}

export function formatSplitTotal(items: ExpenseItemDraft[]): string {
  return formatAmount(sumSplitItems(items));
}

export function calculateSplitRemaining(transactionAmount: string, items: ExpenseItemDraft[]): string {
  const total = parseAmount(transactionAmount);
  return (Math.round((total - sumSplitItems(items)) * 100) / 100).toFixed(2);
}

export function upsertSplitItem(input: {
  items: ExpenseItemDraft[];
  editingItemId: string;
  nameInput: string;
  amountInput: string;
  nextId: () => string;
}): {
  items: ExpenseItemDraft[];
  errors: ExpenseSplitFieldErrors;
} {
  const name = input.nameInput.trim();
  const amount = parseAmount(input.amountInput);

  const errors: ExpenseSplitFieldErrors = {};
  if (!name) {
    errors.expenseItemName = 'Item name is required.';
  }
  if (amount <= 0) {
    errors.expenseItemAmount = 'Item amount must be greater than 0.';
  }

  if (errors.expenseItemName || errors.expenseItemAmount) {
    return {
      items: input.items,
      errors,
    };
  }

  const nextItem: ExpenseItemDraft = {
    id: input.editingItemId || input.nextId(),
    name,
    amount: formatAmount(amount),
  };
  const items = input.editingItemId
    ? input.items.map((item) => (item.id === input.editingItemId ? nextItem : item))
    : [...input.items, nextItem];

  return {
    items,
    errors,
  };
}

export function createRemainingSplitItem(input: {
  itemsLength: number;
  remaining: string;
  nameInput: string;
  nextId: () => string;
}): ExpenseItemDraft | null {
  const remaining = parseAmount(input.remaining);
  if (remaining <= 0) {
    return null;
  }

  return {
    id: input.nextId(),
    name: input.nameInput.trim() || `Item ${input.itemsLength + 1}`,
    amount: formatAmount(remaining),
  };
}
