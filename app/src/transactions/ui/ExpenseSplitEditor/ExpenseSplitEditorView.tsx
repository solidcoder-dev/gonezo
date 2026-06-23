import { useState } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
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
    splitMode: SplitMode;
    splitTotal: string;
    splitBaseAmount: string;
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
    selectMode: (mode: SplitMode) => void;
    editItem: (itemId: string) => void;
    removeItem: (itemId: string) => void;
  }
>;

type SplitEditorMode = 'new' | 'edit';
type SplitMode = 'items' | 'parts';

function SplitItemForm({
  state,
  status,
  provided,
  onSubmit,
  onCancel,
}: Pick<ExpenseSplitEditorViewProps['required'], 'state' | 'status'>
  & Pick<ExpenseSplitEditorViewProps, 'provided'>
  & {
    onSubmit: () => void;
    onCancel: () => void;
  }) {
  return (
    <div className={styles.inlineEditor}>
      <div className={styles.inlineEditorRow}>
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
        <input
          aria-label="Item name"
          value={state.itemName}
          onChange={(event) => provided.commands.changeItemName(event.target.value)}
          placeholder="Description"
          aria-invalid={Boolean(state.itemNameError)}
          aria-describedby={state.itemNameError ? 'composer-item-name-error' : undefined}
        />
        <button
          type="button"
          className={`text-button icon-button ${styles.inlineAction}`}
          aria-label="Confirm split item"
          disabled={status.disabled}
          onClick={onSubmit}
        >
          <i className="bi bi-check-lg" aria-hidden />
        </button>
        <button
          type="button"
          className={`text-button icon-button ${styles.inlineAction}`}
          aria-label="Cancel split item"
          onClick={onCancel}
        >
          <i className="bi bi-x-lg" aria-hidden />
        </button>
      </div>
      {state.itemAmountError ? <p id="composer-item-amount-error" className="field-error">{state.itemAmountError}</p> : null}
      {state.itemNameError ? <p id="composer-item-name-error" className="field-error">{state.itemNameError}</p> : null}
    </div>
  );
}

export function ExpenseSplitEditorView({ required, provided }: ExpenseSplitEditorViewProps) {
  const { data, state, status } = required;
  const [editorMode, setEditorMode] = useState<SplitEditorMode | null>(null);
  const [splitPartsCount, setSplitPartsCount] = useState('2');
  const managerVisible = status.hideToggle || state.enabled;
  const partsCount = Math.max(2, Number(splitPartsCount) || 2);
  const splitCountLabel = state.splitMode === 'parts'
    ? `${partsCount} ${partsCount === 1 ? 'part' : 'parts'}`
    : `${data.items.length} ${data.items.length === 1 ? 'item' : 'items'}`;
  const splitTotal = state.splitMode === 'parts'
    ? state.splitBaseAmount || state.splitTotal || '0.00'
    : state.splitTotal || '0.00';
  const splitTotalNumber = Number(splitTotal) || 0;
  const amountPerPart = splitTotalNumber / partsCount;
  const amountPerPartLabel = amountPerPart.toFixed(2);

  function openNewEditor() {
    provided.commands.startItem();
    provided.commands.selectMode('items');
    setEditorMode('new');
  }

  function openEditEditor(itemId: string) {
    provided.commands.editItem(itemId);
    setEditorMode('edit');
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

  function applyPartsCount(nextCount: number) {
    const normalizedCount = String(Math.max(2, nextCount));
    setSplitPartsCount(normalizedCount);
    provided.commands.splitByParts(state.splitBaseAmount || splitTotal, normalizedCount);
  }

  function selectSplitMode(mode: SplitMode) {
    setEditorMode(null);
    if (mode === 'parts') {
      provided.commands.splitByParts(state.splitBaseAmount || splitTotal, splitPartsCount);
      return;
    }
    provided.commands.selectMode(mode);
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
          <div className={styles.modeTabs} role="tablist" aria-label="Split mode">
            <button
              type="button"
              role="tab"
              aria-selected={state.splitMode === 'items'}
              className={state.splitMode === 'items' ? styles.activeModeTab : undefined}
              onClick={() => selectSplitMode('items')}
              disabled={status.disabled}
            >
              Items
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={state.splitMode === 'parts'}
              className={state.splitMode === 'parts' ? styles.activeModeTab : undefined}
              onClick={() => selectSplitMode('parts')}
              disabled={status.disabled}
            >
              Parts
            </button>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryLabel}>Split total</span>
              <span className={styles.summaryCount}>{splitCountLabel}</span>
            </div>
            <div className={styles.summaryAmount}>
              <strong>{splitTotal}</strong>
              {state.currencyCode ? <span>{state.currencyCode}</span> : null}
            </div>
            <p>This updates the movement amount</p>
          </div>

          {state.splitMode === 'items' ? (
            <>
              <div className={styles.itemsBlock}>
                <h3>Items</h3>
                <ul className={styles.list} aria-label="Expense items">
                  {data.items.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <span className={styles.itemIcon} aria-hidden>
                        <i className="bi bi-fork-knife" />
                      </span>
                      <strong className={styles.itemName}>{item.name}</strong>
                      <span className={styles.itemAmount}>
                        {item.amount} {state.currencyCode ?? ''}
                      </span>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`text-button icon-button ${styles.rowActionButton}`}
                          aria-label={`Edit item ${item.name}`}
                          disabled={status.disabled}
                          onClick={() => openEditEditor(item.id)}
                        >
                          <i className="bi bi-pencil" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={`text-button icon-button ${styles.rowActionButton} ${styles.dangerActionButton}`}
                          aria-label={`Remove item ${item.name}`}
                          disabled={status.disabled}
                          onClick={() => provided.commands.removeItem(item.id)}
                        >
                          <i className="bi bi-trash" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                  {data.items.length === 0 ? (
                    <li className={styles.emptyState}>Add split items to build the breakdown.</li>
                  ) : null}
                  <li className={styles.addItemRow}>
                    <button
                      type="button"
                      className="text-button"
                      aria-label="Add split item"
                      disabled={status.disabled}
                      onClick={openNewEditor}
                    >
                      <i className="bi bi-plus-lg" aria-hidden />
                      <span>Add split item</span>
                    </button>
                  </li>
                </ul>
              </div>

            </>
          ) : (
            <div className={styles.itemsBlock}>
              <h3>Parts</h3>
              <div className={styles.partsCard}>
                <div className={styles.partsControlRow}>
                  <strong>Number of parts</strong>
                  <div className={styles.partsStepper}>
                    <button
                      type="button"
                      className="text-button icon-button"
                      aria-label="Decrease parts"
                      disabled={status.disabled || partsCount <= 2}
                      onClick={() => applyPartsCount(partsCount - 1)}
                    >
                      <i className="bi bi-dash-lg" aria-hidden />
                    </button>
                    <span>{partsCount}</span>
                    <button
                      type="button"
                      className="text-button icon-button"
                      aria-label="Increase parts"
                      disabled={status.disabled}
                      onClick={() => applyPartsCount(partsCount + 1)}
                    >
                      <i className="bi bi-plus-lg" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className={styles.partsControlRow}>
                  <strong>Each part</strong>
                  <span>{amountPerPartLabel} {state.currencyCode ?? ''}</span>
                </div>
              </div>
              <ul className={`${styles.list} ${styles.partsList}`} aria-label="Split parts">
                {Array.from({ length: partsCount }, (_, index) => {
                  const generatedItem = data.items[index];
                  const partAmount = generatedItem?.amount ?? amountPerPartLabel;
                  return (
                    <li key={index + 1} className={styles.partItem}>
                      <span className={styles.partIndex}>{index + 1}</span>
                      <strong>{generatedItem?.name || `Part ${index + 1}`}</strong>
                      <span>{partAmount} {state.currencyCode ?? ''}</span>
                      {generatedItem ? (
                        <button
                          type="button"
                          className={`text-button icon-button ${styles.rowActionButton}`}
                          aria-label={`Edit part ${index + 1}`}
                          disabled={status.disabled}
                          onClick={() => openEditEditor(generatedItem.id)}
                        >
                          <i className="bi bi-pencil" aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {editorMode ? (
            <SplitItemForm
              state={state}
              status={status}
              provided={provided}
              onSubmit={submitEditor}
              onCancel={closeEditor}
            />
          ) : null}

          {state.splitError ? (
            <p className="field-error">{state.splitError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
