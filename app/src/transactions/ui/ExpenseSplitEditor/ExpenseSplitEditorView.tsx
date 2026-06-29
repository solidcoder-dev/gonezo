import type { KeyboardEvent } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { ComposerExpenseItem } from '../TransactionComposer/TransactionComposerView';
import styles from './ExpenseSplitEditorView.module.css';

type SplitMode = 'items' | 'parts';

export type ExpenseSplitEditorViewProps = ViewProps<
  Record<string, never>,
  {
    items: ComposerExpenseItem[];
    itemOptions?: ComposerExpenseItem[];
  },
  {
    enabled: boolean;
    itemName: string;
    itemAmount: string;
    editingItemId: string;
    splitMode: SplitMode;
    splitTotal: string;
    splitBaseAmount: string;
    splitRemaining: string;
    currencyCode?: string;
    itemNameError?: string;
    itemAmountError?: string;
    splitError?: string;
  },
  {
    disabled?: boolean;
    hideToggle?: boolean;
  },
  {
    toggleEnabled: () => void;
    changeItemName: (value: string) => void;
    changeItemAmount: (value: string) => void;
    startItem: () => void;
    cancelItem: () => void;
    addItem: () => boolean;
    splitByParts: (amount: string, parts: string, addedPersonName?: string) => void;
    splitByWeightedParts: (amount: string, parts: Array<{ id?: string; name: string; parts: number }>) => void;
    selectMode: (mode: SplitMode) => void;
    editItem: (itemId: string) => void;
    removeItem: (itemId: string) => void;
  }
>;

function parseAmountCents(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatAmountCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function SplitItemForm({
  state,
  status,
  provided,
  onSubmit,
  currencyCode,
}: Pick<ExpenseSplitEditorViewProps['required'], 'state' | 'status'>
  & Pick<ExpenseSplitEditorViewProps, 'provided'>
  & {
    onSubmit: () => void;
    currencyCode?: string;
  }) {
  const submitLabel = state.editingItemId ? 'Save changes' : 'Save item';

  return (
    <div className={styles.itemForm}>
      <div className={styles.itemFormTitle}>Add / edit item</div>
      <div className={styles.itemFormFields}>
        <label className={styles.itemField}>
          <span>Item name</span>
          <input
            aria-label="Description"
            value={state.itemName}
            onChange={(event) => provided.commands.changeItemName(event.target.value)}
            placeholder="Enter item name"
            aria-invalid={Boolean(state.itemNameError)}
            aria-describedby={state.itemNameError ? 'composer-item-name-error' : undefined}
          />
        </label>
        <label className={styles.itemField}>
          <span>Amount</span>
          <div className={styles.itemAmountField}>
            <input
              aria-label="Item amount"
              type="number"
              min="0.01"
              step="0.01"
              value={state.itemAmount}
              onChange={(event) => provided.commands.changeItemAmount(event.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              aria-invalid={Boolean(state.itemAmountError)}
              aria-describedby={state.itemAmountError ? 'composer-item-amount-error' : undefined}
            />
            {currencyCode ? <span>{currencyCode}</span> : null}
          </div>
        </label>
      </div>
      <button
        type="button"
        aria-label="Add item"
        className={styles.addItemButton}
        disabled={status.disabled}
        onClick={onSubmit}
      >
        <span>{submitLabel}</span>
      </button>
      {state.itemAmountError ? <p id="composer-item-amount-error" className="field-error">{state.itemAmountError}</p> : null}
      {state.itemNameError ? <p id="composer-item-name-error" className="field-error">{state.itemNameError}</p> : null}
    </div>
  );
}

export function ExpenseSplitEditorView({ required, provided }: ExpenseSplitEditorViewProps) {
  const { data, state, status } = required;
  const managerVisible = status.hideToggle || state.enabled;
  const itemCountLabel = `${data.items.length} ${data.items.length === 1 ? 'item' : 'items'}`;
  const amountBeforeSplitCents = parseAmountCents(state.splitBaseAmount);
  const splitAmountCents = parseAmountCents(state.splitTotal);
  const effectiveTotalCents = data.items.length > 0
    ? Math.max(amountBeforeSplitCents, splitAmountCents)
    : amountBeforeSplitCents;
  const amountBeforeSplit = formatAmountCents(amountBeforeSplitCents);
  const splitAmount = formatAmountCents(splitAmountCents);
  const splitTotal = formatAmountCents(effectiveTotalCents);
  const remainingAmount = Number(state.splitRemaining);
  const showRemainingItem = data.items.length > 0 && remainingAmount > 0;
  const hasSplitOverage = data.items.length > 0 && splitAmountCents > amountBeforeSplitCents;

  function editItem(itemId: string) {
    provided.commands.editItem(itemId);
  }

  function editItemFromKeyboard(event: KeyboardEvent, itemId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      editItem(itemId);
    }
  }

  return (
    <div className={`stack ${styles.block}`}>
      {status.hideToggle ? null : (
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={() => {
              if (state.enabled) {
                provided.commands.cancelItem();
              }
              provided.commands.toggleEnabled();
            }}
            disabled={status.disabled}
          />
          Split into items
        </label>
      )}
      {managerVisible ? (
        <div className={`stack ${styles.manager}`}>
          <div className={styles.itemsBlock}>
            <div className={styles.totalLine}>
              <span>Total</span>
              <strong>{splitTotal}</strong>
              {state.currencyCode ? <span>{state.currencyCode}</span> : null}
              <small>{itemCountLabel}</small>
            </div>
            {hasSplitOverage ? (
              <div className={styles.warningBanner} role="alert">
                <i className="bi bi-info-circle" aria-hidden />
                <span>
                  Amount before split: {amountBeforeSplit} {state.currencyCode ?? ''}. Split amount: {splitAmount} {state.currencyCode ?? ''}.
                </span>
              </div>
            ) : null}
            <ul className={`${styles.list} ${styles.itemList}`} aria-label="Expense items">
              {showRemainingItem ? (
                <li className={`${styles.item} ${styles.remainingItem}`} aria-label={`Remaining auto ${state.splitRemaining} ${state.currencyCode ?? ''}`.trim()}>
                  <span className={styles.itemIcon} aria-hidden>
                    <i className="bi bi-calculator" />
                  </span>
                  <strong className={styles.itemName}>Remaining (auto)</strong>
                  <span className={styles.itemAmount}>
                    {state.splitRemaining} {state.currencyCode ?? ''}
                  </span>
                </li>
              ) : null}
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className={styles.item}
                  role="button"
                  tabIndex={status.disabled ? -1 : 0}
                  aria-label={`Edit item ${item.name}`}
                  onClick={() => editItem(item.id)}
                  onKeyDown={(event) => editItemFromKeyboard(event, item.id)}
                >
                  <span className={styles.itemIcon} aria-hidden>
                    <i className="bi bi-bag" />
                  </span>
                  <strong className={styles.itemName}>{item.name}</strong>
                  <span className={styles.itemAmount}>
                    {item.amount} {state.currencyCode ?? ''}
                  </span>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={`text-button icon-button ${styles.rowActionButton} ${styles.dangerActionButton}`}
                      aria-label={`Remove item ${item.name}`}
                      disabled={status.disabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        provided.commands.removeItem(item.id);
                      }}
                    >
                      <i className="bi bi-trash" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
              {data.items.length === 0 ? (
                <li className={styles.emptyState}>
                  <i className="bi bi-receipt" aria-hidden />
                  <strong>No items yet</strong>
                  <span>Add the first item when you want to break down this amount.</span>
                </li>
              ) : null}
            </ul>
            <div className={styles.addPanel}>
              <SplitItemForm
                state={state}
                status={status}
                provided={provided}
                onSubmit={provided.commands.addItem}
                currencyCode={state.currencyCode}
              />
            </div>
          </div>

          {state.splitError ? (
            <p className="field-error">{state.splitError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
