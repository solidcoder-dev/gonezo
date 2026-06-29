export type ExpenseItemDraft = {
  id: string;
  name: string;
  amount: string;
};

export type ExpenseSplitFieldErrors = {
  expenseItemName?: string;
  expenseItemAmount?: string;
};

export type WeightedSplitPart = {
  id?: string;
  name: string;
  parts: number;
};

function parseCents(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatCents(value: number): string {
  return (value / 100).toFixed(2);
}

export function splitAmountByWeightedParts(amountInput: string, parts: WeightedSplitPart[]): string[] {
  const totalCents = parseCents(amountInput);
  const normalizedParts = parts.map((part) => Math.trunc(part.parts));
  const totalParts = normalizedParts.reduce((total, part) => total + part, 0);
  if (!Number.isFinite(totalCents) || totalCents <= 0 || totalParts <= 0 || normalizedParts.some((part) => part <= 0)) {
    return [];
  }

  let allocatedCents = 0;
  return normalizedParts.map((part, index) => {
    if (index === normalizedParts.length - 1) {
      return formatCents(totalCents - allocatedCents);
    }
    const cents = Math.floor((totalCents * part) / totalParts);
    allocatedCents += cents;
    return formatCents(cents);
  });
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
    : [nextItem, ...input.items];

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

export function rebalanceEditedPartSplit(input: {
  items: ExpenseItemDraft[];
  editedItemId: string;
  totalAmount: string;
}): {
  items: ExpenseItemDraft[];
  errors: ExpenseSplitFieldErrors;
} {
  const editedItem = input.items.find((item) => item.id === input.editedItemId);
  const remainingItemCount = input.items.length - 1;
  if (!editedItem || remainingItemCount <= 0) {
    return { items: input.items, errors: {} };
  }

  const totalCents = parseCents(input.totalAmount);
  const editedCents = parseCents(editedItem.amount);
  const remainingCents = totalCents - editedCents;
  if (!Number.isFinite(totalCents) || !Number.isFinite(editedCents) || remainingCents < remainingItemCount) {
    return {
      items: input.items,
      errors: { expenseItemAmount: 'Part amount must leave room for the other parts.' },
    };
  }

  const baseCents = Math.floor(remainingCents / remainingItemCount);
  const remainderCents = remainingCents - baseCents * remainingItemCount;
  let remainingIndex = 0;
  const items = input.items.map((item) => {
    if (item.id === input.editedItemId) {
      return item;
    }
    const cents = baseCents + (remainingIndex === remainingItemCount - 1 ? remainderCents : 0);
    remainingIndex += 1;
    return { ...item, amount: formatCents(cents) };
  });

  return { items, errors: {} };
}
