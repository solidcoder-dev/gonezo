import type { ViewProps } from '../../shared/ui/ViewProps';
import type { ComposerExpenseItem } from './TransactionComposerView';

export type ExpenseSplitEditorViewProps = ViewProps<
  Record<string, never>,
  {
    items: ComposerExpenseItem[];
  },
  {
    enabled: boolean;
    itemName: string;
    itemAmount: string;
    remaining: string;
    currencyCode?: string;
    itemNameError?: string;
    itemAmountError?: string;
    splitError?: string;
  },
  {
    disabled?: boolean;
  },
  {
    toggleEnabled: () => void;
    changeItemName: (value: string) => void;
    changeItemAmount: (value: string) => void;
    addItem: () => void;
    assignRemaining: () => void;
    editItem: (itemId: string) => void;
    removeItem: (itemId: string) => void;
  }
>;

export function ExpenseSplitEditorView({ required, provided }: ExpenseSplitEditorViewProps) {
  const { data, state, status } = required;

  return (
    <div className="stack composer-expense-split-block">
      <label className="inline-checkbox">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={provided.commands.toggleEnabled}
          disabled={status.disabled}
        />
        Split into items
      </label>
      {state.enabled ? (
        <div className="stack item-editor">
          <div className="inline-header">
            <strong>Items</strong>
            <span className={state.remaining === '0.00' ? 'hint success' : 'hint'}>
              Remaining: {state.remaining} {state.currencyCode ?? ''}
            </span>
          </div>
          <div className="quick-row">
            <input
              aria-label="Item name"
              value={state.itemName}
              onChange={(event) => provided.commands.changeItemName(event.target.value)}
              placeholder="Item name"
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
          </div>
          {state.itemNameError ? <p id="composer-item-name-error" className="field-error">{state.itemNameError}</p> : null}
          {state.itemAmountError ? <p id="composer-item-amount-error" className="field-error">{state.itemAmountError}</p> : null}
          <div className="quick-row">
            <button type="button" className="text-button" onClick={provided.commands.addItem}>
              Add item
            </button>
            <button type="button" className="text-button" onClick={provided.commands.assignRemaining}>
              Assign remaining
            </button>
          </div>
          <ul className="expense-list" aria-label="Expense items">
            {data.items.map((item) => (
              <li key={item.id} className="expense-item">
                <div className="inline-header">
                  <strong>{item.name}</strong>
                  <span>{item.amount}</span>
                </div>
                <div className="quick-row">
                  <button type="button" className="text-button" onClick={() => provided.commands.editItem(item.id)}>
                    Edit
                  </button>
                  <button type="button" className="text-button" onClick={() => provided.commands.removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {state.splitError ? (
            <p className="field-error">{state.splitError}</p>
          ) : (
            <p className="hint">Publish becomes available when Remaining is 0.00.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
