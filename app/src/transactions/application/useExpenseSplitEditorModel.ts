import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExpenseItemDraft, TransactionFieldErrors } from './transactions.types';
import type { TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';
import { useTagSelectionModel } from '../../taxonomy/application/useTagSelectionModel';
import {
  calculateSplitRemaining,
  cloneSplitItems,
  formatSplitTotal,
  rebalanceEditedPartSplit,
  splitAmountByWeightedParts,
  upsertSplitItem,
} from '../domain/expenseSplit';
import type { WeightedSplitPart } from '../domain/expenseSplit';

type UseExpenseSplitEditorModelInput = {
  transactionAmount: string;
  nextId: () => string;
  setFieldErrors: Dispatch<SetStateAction<TransactionFieldErrors>>;
  tags?: TaxonomyTagItem[];
};

type SplitEditorSnapshot = {
  expenseDetailed: boolean;
  splitApplied: boolean;
  splitDraftMode: SplitDraftMode;
  expenseItemName: string;
  expenseItemAmount: string;
  manualExpenseItems: ExpenseItemDraft[];
  partsExpenseItems: ExpenseItemDraft[];
  partsBaseAmount: string;
  editingExpenseItemId: string;
  expenseItemTagNames: string[];
};

type SplitDraftMode = 'items' | 'parts';

function splitAmountIntoParts(amountInput: string, partsInput: string): string[] {
  const amount = Number(amountInput.trim());
  const parts = Math.trunc(Number(partsInput.trim()));
  if (!Number.isFinite(amount) || !Number.isFinite(parts) || amount <= 0 || parts < 2) {
    return [];
  }

  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / parts);
  const remainderCents = totalCents - baseCents * parts;

  return Array.from({ length: parts }, (_, index) => {
    const cents = index === parts - 1 ? baseCents + remainderCents : baseCents;
    return (cents / 100).toFixed(2);
  });
}

function preserveTagNames<T extends { id: string; name: string; amount: string }>(item: T, tagNames: string[] = []): T & { tagNames?: string[] } {
  if (tagNames.length > 0) return { ...item, tagNames };
  const itemWithoutTags = { ...item } as T & { tagNames?: string[] };
  delete itemWithoutTags.tagNames;
  return itemWithoutTags;
}

export function useExpenseSplitEditorModel(input: UseExpenseSplitEditorModelInput) {
  const {
    transactionAmount,
    nextId,
    setFieldErrors,
  } = input;
  const [expenseDetailed, setExpenseDetailed] = useState(false);
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const [splitApplied, setSplitApplied] = useState(false);
  const [splitEditorSnapshot, setSplitEditorSnapshot] = useState<SplitEditorSnapshot | null>(null);
  const [splitDraftMode, setSplitDraftMode] = useState<SplitDraftMode>('items');
  const [expenseItemName, setExpenseItemName] = useState('');
  const [expenseItemAmount, setExpenseItemAmount] = useState('');
  const [manualExpenseItems, setManualExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [partsExpenseItems, setPartsExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [partsBaseAmount, setPartsBaseAmount] = useState('');
  const [editingExpenseItemId, setEditingExpenseItemId] = useState('');
  const itemTagSelection = useTagSelectionModel(input.tags ?? []);
  const expenseItems = splitDraftMode === 'parts' ? partsExpenseItems : manualExpenseItems;

  const expenseRemaining = useMemo(
    () => calculateSplitRemaining(transactionAmount, expenseItems),
    [transactionAmount, expenseItems],
  );
  const expenseSplitTotal = useMemo(() => formatSplitTotal(expenseItems), [expenseItems]);

  function reset() {
    setExpenseDetailed(false);
    setSplitEditorOpen(false);
    setSplitApplied(false);
    setSplitEditorSnapshot(null);
    setSplitDraftMode('items');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setManualExpenseItems([]);
    setPartsExpenseItems([]);
    setPartsBaseAmount('');
    setEditingExpenseItemId('');
    itemTagSelection.actions.reset();
  }

  function prefill(items: Array<{ id?: string; name: string; amount: string; tagNames?: string[] }>) {
    setExpenseDetailed(items.length > 0);
    setSplitApplied(items.length > 0);
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
    setSplitDraftMode('items');
    setManualExpenseItems(cloneSplitItems(items.map(({ name, amount }) => ({ id: '', name, amount })), nextId).map((item, index) => preserveTagNames(item, items[index]?.tagNames ?? [])));
    setPartsExpenseItems([]);
    setPartsBaseAmount('');
    setEditingExpenseItemId('');
    itemTagSelection.actions.reset();
  }

  function setActiveExpenseItems(items: ExpenseItemDraft[]) {
    if (splitDraftMode === 'parts') {
      setPartsExpenseItems(items);
      return;
    }
    setManualExpenseItems(items);
  }

  function setExpenseDetailedValue(value: boolean) {
    setExpenseDetailed(value);
    setSplitApplied(value);
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

  function addExpenseItem(): boolean {
    const result = upsertSplitItem({
      items: expenseItems,
      editingItemId: editingExpenseItemId,
      nameInput: expenseItemName,
      amountInput: expenseItemAmount,
      nextId,
    });

    if (result.errors.expenseItemName || result.errors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...result.errors }));
      return false;
    }

    const nextItems = splitDraftMode === 'parts' && editingExpenseItemId
      ? rebalanceEditedPartSplit({
        items: result.items,
        editedItemId: editingExpenseItemId,
        totalAmount: partsBaseAmount || transactionAmount,
      })
      : result;

    if (nextItems.errors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...nextItems.errors }));
      return false;
    }

    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
    const upsertedItemId = result.upsertedItemId;
    setActiveExpenseItems(nextItems.items.map((item) => item.id === upsertedItemId
      ? preserveTagNames(item, itemTagSelection.state.selectedNames)
      : preserveTagNames(item, expenseItems.find((existing) => existing.id === item.id)?.tagNames ?? [])));
    setExpenseItemName('');
    setExpenseItemAmount('');
    setEditingExpenseItemId('');
    itemTagSelection.actions.reset();
    return true;
  }

  function editExpenseItem(itemId: string) {
    const item = expenseItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }

    setEditingExpenseItemId(item.id);
    setExpenseItemName(item.name);
    setExpenseItemAmount(item.amount);
    itemTagSelection.actions.prefill(item.tagNames ?? []);
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  function startExpenseItem() {
    setEditingExpenseItemId('');
    setExpenseItemName('');
    setExpenseItemAmount('');
    itemTagSelection.actions.reset();
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
    }));
  }

  function cancelExpenseItem() {
    setEditingExpenseItemId('');
    setExpenseItemName('');
    setExpenseItemAmount('');
    itemTagSelection.actions.reset();
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
    }));
  }

  function removeExpenseItem(itemId: string) {
    if (splitDraftMode === 'parts') {
      const remainingItems = expenseItems.filter((item) => item.id !== itemId);
      if (remainingItems.length <= 1) {
        setPartsExpenseItems([]);
      } else {
        const partAmounts = splitAmountIntoParts(partsBaseAmount || transactionAmount, String(remainingItems.length));
      setPartsExpenseItems(remainingItems.map((item, index) => ({
          ...item,
          amount: partAmounts[index] ?? item.amount,
        })));
      }
      if (editingExpenseItemId === itemId) {
        setEditingExpenseItemId('');
        setExpenseItemName('');
        setExpenseItemAmount('');
        itemTagSelection.actions.reset();
      }
      return;
    }

    setActiveExpenseItems(expenseItems.filter((item) => item.id !== itemId));
    if (editingExpenseItemId === itemId) {
      setEditingExpenseItemId('');
      setExpenseItemName('');
      setExpenseItemAmount('');
      itemTagSelection.actions.reset();
    }
  }

  function splitExpenseByParts(amountInput: string, partsInput: string, addedPersonName = '') {
    const parts = Math.trunc(Number(partsInput.trim()));
    if (!Number.isFinite(parts) || parts <= 1) {
      setSplitDraftMode('parts');
      setPartsExpenseItems([]);
      setPartsBaseAmount(amountInput.trim());
      setExpenseItemName('');
      setExpenseItemAmount('');
      itemTagSelection.actions.reset();
      setEditingExpenseItemId('');
      setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
      return;
    }

    const partAmounts = splitAmountIntoParts(amountInput, partsInput);
    if (partAmounts.length === 0) {
      return;
    }

    const addedName = addedPersonName.trim();
    const insertingNamedPerson = Boolean(addedName) && partAmounts.length > partsExpenseItems.length;
    const orderedExistingItems = insertingNamedPerson
      ? [
        partsExpenseItems[0] ?? { id: nextId(), name: 'Me', amount: '' },
        { id: nextId(), name: addedName, amount: '' },
        ...partsExpenseItems.slice(1),
      ]
      : partsExpenseItems;

    const nextItems = partAmounts.map((amount, index) => {
      const existingItem = orderedExistingItems[index];
      const fallbackName = index === 0 ? 'Me' : `Person ${index + 1}`;
      const name = existingItem?.name ?? fallbackName;
      return {
        id: existingItem?.id ?? nextId(),
        name,
        amount,
      };
    });

    setSplitDraftMode('parts');
    setPartsExpenseItems(nextItems);
    setPartsBaseAmount(amountInput.trim());
    setExpenseItemName('');
    setExpenseItemAmount('');
    itemTagSelection.actions.reset();
    setEditingExpenseItemId('');
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  function splitExpenseByWeightedParts(amountInput: string, weightedParts: WeightedSplitPart[]) {
    const normalizedParts = weightedParts
      .map((part, index) => ({
        id: part.id,
        name: part.name.trim() || (index === 0 ? 'Me' : `Person ${index + 1}`),
        parts: Math.trunc(part.parts),
      }))
      .filter((part) => part.parts > 0);
    const partAmounts = splitAmountByWeightedParts(amountInput, normalizedParts);
    if (partAmounts.length <= 1) {
      return;
    }

    const nextItems = normalizedParts.map((part, index) => ({
      id: part.id || partsExpenseItems[index]?.id || nextId(),
      name: part.name,
      amount: partAmounts[index] ?? '0.00',
      ...(partsExpenseItems[index]?.tagNames?.length ? { tagNames: partsExpenseItems[index].tagNames } : {}),
    }));

    setSplitDraftMode('parts');
    setPartsExpenseItems(nextItems);
    setPartsBaseAmount(amountInput.trim());
    setExpenseItemName('');
    setExpenseItemAmount('');
    itemTagSelection.actions.reset();
    setEditingExpenseItemId('');
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  function openSplitEditor() {
    setSplitEditorSnapshot({
      expenseDetailed,
      splitApplied,
      splitDraftMode,
      expenseItemName,
      expenseItemAmount,
      manualExpenseItems,
      partsExpenseItems,
      partsBaseAmount,
      editingExpenseItemId,
      expenseItemTagNames: itemTagSelection.state.selectedNames,
    });
    setExpenseDetailed(true);
    setSplitEditorOpen(true);
  }

  function closeSplitEditor() {
    if (splitEditorSnapshot) {
      setExpenseDetailed(splitEditorSnapshot.expenseDetailed);
      setSplitApplied(splitEditorSnapshot.splitApplied);
      setSplitDraftMode(splitEditorSnapshot.splitDraftMode);
      setExpenseItemName(splitEditorSnapshot.expenseItemName);
      setExpenseItemAmount(splitEditorSnapshot.expenseItemAmount);
      setManualExpenseItems(splitEditorSnapshot.manualExpenseItems);
      setPartsExpenseItems(splitEditorSnapshot.partsExpenseItems);
      setPartsBaseAmount(splitEditorSnapshot.partsBaseAmount);
      setEditingExpenseItemId(splitEditorSnapshot.editingExpenseItemId);
      itemTagSelection.actions.prefill(splitEditorSnapshot.expenseItemTagNames);
    }
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
  }

  function applySplit() {
    setExpenseDetailed(true);
    setSplitApplied(true);
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  function removeSplit() {
    setExpenseDetailed(false);
    setSplitApplied(false);
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
    setSplitDraftMode('items');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setManualExpenseItems([]);
    setPartsExpenseItems([]);
    setPartsBaseAmount('');
    setEditingExpenseItemId('');
    itemTagSelection.actions.reset();
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  return {
    state: {
      expenseDetailed,
      splitEditorOpen,
      splitApplied,
      splitDraftMode,
      expenseItemName,
      expenseItemAmount,
      editingExpenseItemId,
      expenseItems,
      expenseItemOptions: manualExpenseItems,
      expenseRemaining,
      expenseSplitTotal,
      expenseItemTagNames: itemTagSelection.state.selectedNames,
      itemTagSelection: itemTagSelection.state,
    },
    actions: {
      reset,
      prefill,
      openSplitEditor,
      closeSplitEditor,
      applySplit,
      removeSplit,
      setSplitDraftMode,
      setExpenseDetailedValue,
      setExpenseItemNameValue,
      setExpenseItemAmountValue,
      setExpenseItemTagQuery: itemTagSelection.actions.setQuery,
      selectExpenseItemTag: itemTagSelection.actions.select,
      createExpenseItemTag: itemTagSelection.actions.add,
      removeExpenseItemTag: itemTagSelection.actions.remove,
      removeLastExpenseItemTag: itemTagSelection.actions.removeLast,
      addExpenseItem,
      startExpenseItem,
      cancelExpenseItem,
      editExpenseItem,
      removeExpenseItem,
      splitExpenseByParts,
      splitExpenseByWeightedParts,
    },
  };
}
