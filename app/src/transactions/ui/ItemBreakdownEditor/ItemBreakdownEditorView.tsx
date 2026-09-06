import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { ComposerExpenseItem } from '../TransactionComposer/TransactionComposerView';
import styles from './ItemBreakdownEditorView.module.css';
import { AmountInputView } from '../../../shared/ui/AmountInput/AmountInputView';
import { MultiTagPickerView } from '../../../shared/ui/MultiTagPicker/MultiTagPickerView';

type BreakdownMode = 'items' | 'parts';

export type ItemBreakdownEditorViewProps = ViewProps<
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
    splitMode: BreakdownMode;
    splitTotal: string;
    splitBaseAmount: string;
    splitRemaining: string;
    currencyCode?: string;
    itemNameError?: string;
    itemAmountError?: string;
    splitError?: string;
    itemTagNames?: string[];
    tagQuery?: string;
    itemTagOptions?: Array<{ id: string; name: string }>;
    itemTagSuggestions?: Array<{ id: string; name: string }>;
    tagCreateCandidate?: string;
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
    selectMode: (mode: BreakdownMode) => void;
    editItem: (itemId: string) => void;
    removeItem: (itemId: string) => void;
    changeTagQuery?: (value: string) => void;
    selectTag?: (tagId: string) => void;
    createTag?: (name: string) => void;
    removeTag?: (tagId: string) => void;
    removeLastTag?: () => void;
  }
>;

function parseAmountCents(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatAmountCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function ItemForm({
  state,
  status,
  provided,
  onSubmit,
  currencyCode,
}: Pick<ItemBreakdownEditorViewProps['required'], 'state' | 'status'>
  & Pick<ItemBreakdownEditorViewProps, 'provided'>
  & {
    onSubmit: () => void;
    currencyCode?: string;
  }) {
  const submitLabel = state.editingItemId ? 'Save changes' : 'Save item';

  return (
    <div className={styles.itemForm}>
      <div className={styles.itemFormTitle}>{state.editingItemId ? 'Edit item' : 'Add item'}</div>
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
        <div className={styles.itemField}>
          <AmountInputView
            required={{ config: { label: 'Item amount', currency: currencyCode, variant: 'default' }, data: {}, state: { value: state.itemAmount }, status: { disabled: status.disabled, error: state.itemAmountError } }}
            provided={{ commands: { change: provided.commands.changeItemAmount } }}
          />
        </div>
        {provided.commands.selectTag ? (
          <MultiTagPickerView
            required={{ config: { label: 'Tags', placeholder: 'Add tag...' }, data: { selectedTags: state.itemTagOptions ?? [], suggestions: state.itemTagSuggestions ?? [] }, state: { query: state.tagQuery ?? '', createCandidate: state.tagCreateCandidate }, status: { disabled: status.disabled } }}
            provided={{ commands: { changeQuery: provided.commands.changeTagQuery!, selectTag: provided.commands.selectTag, createTag: provided.commands.createTag!, removeTag: provided.commands.removeTag!, removeLastTag: provided.commands.removeLastTag! } }}
          />
        ) : null}
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
      {state.editingItemId ? (
        <button
          type="button"
          className="btn btn-link text-danger p-0 align-self-start"
          onClick={() => provided.commands.removeItem(state.editingItemId)}
          disabled={status.disabled}
        >
          Delete item
        </button>
      ) : null}
      {state.itemAmountError ? <p id="composer-item-amount-error" className="gz-field-error">{state.itemAmountError}</p> : null}
      {state.itemNameError ? <p id="composer-item-name-error" className="gz-field-error">{state.itemNameError}</p> : null}
    </div>
  );
}

export function ItemBreakdownEditorView({ required, provided }: ItemBreakdownEditorViewProps) {
  const { data, state, status } = required;
  const managerVisible = status.hideToggle || state.enabled;
  const itemCountLabel = `${data.items.length} ${data.items.length === 1 ? 'item' : 'items'}`;
  const movementAmountCents = parseAmountCents(state.splitBaseAmount);
  const itemsAmountCents = parseAmountCents(state.splitTotal);
  const effectiveTotalCents = data.items.length > 0
    ? Math.max(movementAmountCents, itemsAmountCents)
    : movementAmountCents;
  const movementAmount = formatAmountCents(movementAmountCents);
  const itemsAmount = formatAmountCents(itemsAmountCents);
  const displayedTotal = formatAmountCents(effectiveTotalCents);
  const remainingAmount = Number(state.splitRemaining);
  const showRemainingItem = data.items.length > 0 && remainingAmount > 0;
  const hasItemsOverage = data.items.length > 0 && itemsAmountCents > movementAmountCents;

  function editItem(itemId: string) {
    provided.commands.editItem(itemId);
  }

  return (
    <div className={`vstack gap-2 ${styles.block}`}>
      {status.hideToggle ? null : (
        <label className="gz-inline-checkbox">
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
          Add items
        </label>
      )}
      {managerVisible ? (
        <div className={`vstack gap-2 ${styles.manager}`}>
          <div className={styles.itemsBlock}>
            <div className={styles.totalLine}>
              <span>Items total</span>
              <strong>{displayedTotal}</strong>
              {state.currencyCode ? <span>{state.currencyCode}</span> : null}
              <small>{itemCountLabel}</small>
            </div>
            {hasItemsOverage ? (
              <div className={styles.warningBanner} role="alert">
                <i className="bi bi-info-circle" aria-hidden />
                <span>
                  Movement amount: {movementAmount} {state.currencyCode ?? ''}. Items total: {itemsAmount} {state.currencyCode ?? ''}.
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
                <li key={item.id} className={styles.itemRow}>
                  <button
                    type="button"
                    className={`${styles.item} ${styles.itemButton}`}
                    disabled={status.disabled}
                    aria-label={`Edit item ${item.name}`}
                    onClick={() => editItem(item.id)}
                  >
                    <span className="vstack gap-1">
                      <strong className={styles.itemName}>{item.name}</strong>
                      {item.tagNames?.length ? <span className="small text-muted">{item.tagNames.join(', ')}</span> : null}
                    </span>
                    <span className={styles.itemAmount}>
                      {item.amount} {state.currencyCode ?? ''}
                    </span>
                  </button>
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
              <ItemForm
                state={state}
                status={status}
                provided={provided}
                onSubmit={provided.commands.addItem}
                currencyCode={state.currencyCode}
              />
            </div>
          </div>

          {state.splitError ? (
            <p className="gz-field-error">{state.splitError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
