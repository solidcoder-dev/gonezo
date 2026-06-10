import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import splitStyles from '../../../shared/ui/SplitManager/SplitManager.module.css';
import type { ComposerExpenseItem } from '../TransactionComposer/TransactionComposerView';
import styles from './ExpenseSplitEditorView.module.css';

export type ExpenseSplitEditorViewProps = ViewProps<
  Record<string, never>,
  {
    items: ComposerExpenseItem[];
  },
  {
    enabled: boolean;
    itemName: string;
    itemAmount: string;
    editingItemId: string;
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
    splitByParts: (amount: string, parts: string) => void;
    editItem: (itemId: string) => void;
    removeItem: (itemId: string) => void;
  }
>;

type SplitEditorMode = 'new' | 'edit';

type SplitRowMenuState = {
  itemId: string;
  top?: number;
  bottom?: number;
  right: number;
};

export function ExpenseSplitEditorView({ required, provided }: ExpenseSplitEditorViewProps) {
  const { data, state, status } = required;
  const [editorMode, setEditorMode] = useState<SplitEditorMode | null>(null);
  const [rowMenu, setRowMenu] = useState<SplitRowMenuState | null>(null);
  const [splitPartsOpen, setSplitPartsOpen] = useState(false);
  const [splitPartsAmount, setSplitPartsAmount] = useState('');
  const [splitPartsCount, setSplitPartsCount] = useState('2');
  const rowMenuItem = rowMenu ? data.items.find((item) => item.id === rowMenu.itemId) : undefined;
  const managerVisible = status.hideToggle || state.enabled;

  function openNewEditor() {
    provided.commands.startItem();
    setEditorMode('new');
    setSplitPartsOpen(false);
  }

  function closeEditor() {
    provided.commands.cancelItem();
    setEditorMode(null);
  }

  function submitEditor() {
    const saved = provided.commands.addItem();
    if (saved) {
      setEditorMode(null);
    }
  }

  function openSplitParts() {
    setSplitPartsAmount('0.00');
    setSplitPartsCount('2');
    setEditorMode(null);
    setSplitPartsOpen(true);
  }

  function applySplitParts() {
    provided.commands.splitByParts(splitPartsAmount, splitPartsCount);
    setSplitPartsOpen(false);
  }

  function closeSplitParts() {
    setSplitPartsOpen(false);
    setSplitPartsAmount('');
    setSplitPartsCount('2');
  }

  function toggleRowMenu(itemId: string, button: HTMLButtonElement) {
    if (status.disabled) {
      return;
    }
    if (rowMenu?.itemId === itemId) {
      setRowMenu(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const openAbove = window.innerHeight - rect.bottom < 104;
    setRowMenu({
      itemId,
      right: Math.max(8, window.innerWidth - rect.right),
      ...(openAbove
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 4) }
        : { top: rect.bottom + 4 }),
    });
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
                setEditorMode(null);
                setRowMenu(null);
                setSplitPartsOpen(false);
              }
              provided.commands.toggleEnabled();
            }}
            disabled={status.disabled}
          />
          Split into items
        </label>
      )}
      {managerVisible ? (
        <div className={`stack item-editor ${styles.manager}`}>
          <div className={splitStyles.toolbar}>
            <div className={splitStyles.title}>
              <strong>Splits</strong>
            </div>
            <div className={splitStyles.toolbarActions}>
              <button
                type="button"
                className={`text-button ${splitStyles.actionButton} ${splitStyles.primaryAction}`}
                aria-label="Add split item"
                disabled={status.disabled}
                onClick={openNewEditor}
              >
                <i className="bi bi-plus-lg" aria-hidden />
                Add
              </button>
              <button
                type="button"
                className={`text-button ${splitStyles.actionButton}`}
                disabled={status.disabled}
                onClick={openSplitParts}
              >
                <i className="bi bi-diagram-3" aria-hidden />
                Split by parts
              </button>
            </div>
          </div>

          {data.items.length > 0 ? (
            <ul className={splitStyles.list} aria-label="Expense items">
              {data.items.map((item) => (
                editorMode === 'edit' && state.editingItemId === item.id ? (
                  <li key={item.id} className={styles.inlineEditorItem}>
                    <div className={styles.inlineEditorRow}>
                      <input
                        aria-label="Item name"
                        value={state.itemName}
                        onChange={(event) => provided.commands.changeItemName(event.target.value)}
                        placeholder="Item"
                        aria-invalid={Boolean(state.itemNameError)}
                        aria-describedby={state.itemNameError ? 'composer-item-name-error' : undefined}
                      />
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
                      <button
                        type="button"
                        className={`text-button icon-button ${styles.inlineAction}`}
                        aria-label="Confirm split item"
                        disabled={status.disabled}
                        onClick={submitEditor}
                      >
                        <i className="bi bi-check-lg" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={`text-button icon-button ${styles.inlineAction}`}
                        aria-label="Cancel split item"
                        onClick={closeEditor}
                      >
                        <i className="bi bi-x-lg" aria-hidden />
                      </button>
                    </div>
                    {state.itemNameError ? <p id="composer-item-name-error" className="field-error">{state.itemNameError}</p> : null}
                    {state.itemAmountError ? <p id="composer-item-amount-error" className="field-error">{state.itemAmountError}</p> : null}
                  </li>
                ) : (
                  <li key={item.id} className={splitStyles.item}>
                    <strong className={splitStyles.itemName}>{item.name}</strong>
                    <span className={splitStyles.itemAmount}>{item.amount}</span>
                    <span className={splitStyles.itemStatus} aria-hidden />
                    <div className={splitStyles.rowActions}>
                      <button
                        type="button"
                        className={`text-button icon-button ${splitStyles.menuButton}`}
                        aria-label={`Item actions for ${item.name}`}
                        aria-expanded={rowMenu?.itemId === item.id}
                        aria-haspopup="menu"
                        disabled={status.disabled}
                        onClick={(event) => toggleRowMenu(item.id, event.currentTarget)}
                      >
                        <i className="bi bi-three-dots" aria-hidden />
                      </button>
                    </div>
                  </li>
                )
              ))}
            </ul>
          ) : (
            <p className={`hint ${splitStyles.empty}`}>No split items yet.</p>
          )}

          {editorMode === 'new' ? (
            <div className={styles.inlineEditor}>
              <div className={styles.inlineEditorRow}>
                <input
                  aria-label="Item name"
                  value={state.itemName}
                  onChange={(event) => provided.commands.changeItemName(event.target.value)}
                  placeholder="Item"
                  aria-invalid={Boolean(state.itemNameError)}
                  aria-describedby={state.itemNameError ? 'composer-item-name-error' : undefined}
                />
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
                <button
                  type="button"
                  className={`text-button icon-button ${styles.inlineAction}`}
                  aria-label="Confirm split item"
                  disabled={status.disabled}
                  onClick={submitEditor}
                >
                  <i className="bi bi-check-lg" aria-hidden />
                </button>
                <button
                  type="button"
                  className={`text-button icon-button ${styles.inlineAction}`}
                  aria-label="Cancel split item"
                  onClick={closeEditor}
                >
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              </div>
              {state.itemNameError ? <p id="composer-item-name-error" className="field-error">{state.itemNameError}</p> : null}
              {state.itemAmountError ? <p id="composer-item-amount-error" className="field-error">{state.itemAmountError}</p> : null}
            </div>
          ) : null}

          {splitPartsOpen ? (
            <div className={styles.inlineEditor}>
              <div className={styles.inlineEditorRow}>
                <input
                  aria-label="Amount to split"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={splitPartsAmount}
                  inputMode="decimal"
                  onChange={(event) => setSplitPartsAmount(event.target.value)}
                  placeholder="Amount"
                />
                <input
                  aria-label="Parts"
                  type="number"
                  min="2"
                  step="1"
                  value={splitPartsCount}
                  onChange={(event) => setSplitPartsCount(event.target.value)}
                  placeholder="Parts"
                />
                <button
                  type="button"
                  className={`text-button icon-button ${styles.inlineAction}`}
                  aria-label="Confirm split by parts"
                  disabled={status.disabled || Number(splitPartsAmount) <= 0 || Number(splitPartsCount) < 2}
                  onClick={applySplitParts}
                >
                  <i className="bi bi-check-lg" aria-hidden />
                </button>
                <button
                  type="button"
                  className={`text-button icon-button ${styles.inlineAction}`}
                  aria-label="Cancel split by parts"
                  onClick={closeSplitParts}
                >
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {state.splitError ? (
            <p className="field-error">{state.splitError}</p>
          ) : null}

        </div>
      ) : null}
      {rowMenu && rowMenuItem ? createPortal(
        <>
          <button
            type="button"
            className={styles.menuBackdrop}
            aria-label="Close split item actions"
            onClick={() => setRowMenu(null)}
          />
          <div
            className={`${splitStyles.menu} ${styles.portalMenu}`}
            role="menu"
            aria-label={`Item actions for ${rowMenuItem.name}`}
            style={{ top: rowMenu.top, bottom: rowMenu.bottom, right: rowMenu.right }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={status.disabled}
              aria-label={`Edit item ${rowMenuItem.name}`}
              onClick={() => {
                provided.commands.editItem(rowMenuItem.id);
                setRowMenu(null);
                setEditorMode('edit');
              }}
            >
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className={splitStyles.dangerMenuItem}
              disabled={status.disabled}
              aria-label={`Remove item ${rowMenuItem.name}`}
              onClick={() => {
                provided.commands.removeItem(rowMenuItem.id);
                setRowMenu(null);
              }}
            >
              Remove
            </button>
          </div>
        </>,
        document.body,
      ) : null}
    </div>
  );
}
