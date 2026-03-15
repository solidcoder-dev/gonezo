import { useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';

export type ComposerMode = 'picker' | 'expense' | 'income' | 'transfer';

export type ComposerExpenseItem = {
  id: string;
  name: string;
  amount: string;
};

type Props = {
  open: boolean;
  mode: ComposerMode;
  disabled: boolean;
  amount: string;
  date: string;
  note: string;
  advancedOpen: boolean;
  transferTargetAccountId: string;
  transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  expenseDetailed: boolean;
  expenseItems: ComposerExpenseItem[];
  expenseItemName: string;
  expenseItemAmount: string;
  expenseRemaining: string;
  currencyCode?: string;
  expenseItemNameError?: string;
  expenseItemAmountError?: string;
  expenseSplitError?: string;
  amountError?: string;
  dateError?: string;
  onOpen: () => void;
  onClose: () => void;
  onSelectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
  onToggleAdvanced: () => void;
  onSetAmount: (value: string) => void;
  onSetDate: (value: string) => void;
  onSetNote: (value: string) => void;
  onSetTransferTarget: (value: string) => void;
  onToggleExpenseDetailed: () => void;
  onSetExpenseItemName: (value: string) => void;
  onSetExpenseItemAmount: (value: string) => void;
  onAddExpenseItem: () => void;
  onRemoveExpenseItem: (itemId: string) => void;
  onAssignRemaining: () => void;
  onSubmit: (event: FormEvent) => Promise<void> | void;
};

function titleForMode(mode: ComposerMode): string {
  if (mode === 'expense') return 'New expense';
  if (mode === 'income') return 'New income';
  if (mode === 'transfer') return 'New transfer';
  return 'Add movement';
}

export function TransactionComposer({
  open,
  mode,
  disabled,
  amount,
  date,
  note,
  advancedOpen,
  transferTargetAccountId,
  transferTargetOptions,
  expenseDetailed,
  expenseItems,
  expenseItemName,
  expenseItemAmount,
  expenseRemaining,
  currencyCode,
  expenseItemNameError,
  expenseItemAmountError,
  expenseSplitError,
  amountError,
  dateError,
  onOpen,
  onClose,
  onSelectMode,
  onToggleAdvanced,
  onSetAmount,
  onSetDate,
  onSetNote,
  onSetTransferTarget,
  onToggleExpenseDetailed,
  onSetExpenseItemName,
  onSetExpenseItemAmount,
  onAddExpenseItem,
  onRemoveExpenseItem,
  onAssignRemaining,
  onSubmit,
}: Props) {
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && mode !== 'picker') {
      const timer = window.setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 20);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open, mode]);

  const submitLabel = useMemo(() => {
    if (mode === 'expense') return expenseDetailed ? 'Publish expense' : 'Save expense';
    if (mode === 'income') return 'Save income';
    if (mode === 'transfer') return 'Save transfer';
    return 'Continue';
  }, [mode, expenseDetailed]);

  const splitReady = useMemo(() => {
    if (mode !== 'expense' || !expenseDetailed) {
      return true;
    }
    return expenseItems.length > 0 && Number(expenseRemaining) === 0;
  }, [expenseDetailed, expenseItems.length, expenseRemaining, mode]);

  if (!open) {
    return (
      <button type="button" className="fab-button" onClick={onOpen} aria-label="Add movement">
        + Movement
      </button>
    );
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="sheet-panel composer-sheet" role="dialog" aria-modal="true" aria-label="Transaction composer" onClick={(event) => event.stopPropagation()}>
        <div className="inline-header">
          <h3>{titleForMode(mode)}</h3>
          <button type="button" className="text-button icon-button" onClick={onClose} aria-label="Close transaction composer">
            ×
          </button>
        </div>

        {mode === 'picker' ? (
          <div className="stack">
            <button type="button" onClick={() => onSelectMode('expense')}>
              Expense
            </button>
            <button type="button" onClick={() => onSelectMode('income')}>
              Income
            </button>
            <button type="button" onClick={() => onSelectMode('transfer')}>
              Transfer
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={onSubmit} aria-busy={disabled}>
            <label className="stack">
              Amount
              <input
                ref={amountInputRef}
                aria-label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => onSetAmount(event.target.value)}
                inputMode="decimal"
              />
            </label>
            {amountError ? <p className="field-error">{amountError}</p> : null}

            <div className="inline-header">
              <span className="hint">Need more fields?</span>
              <button type="button" className="text-button" onClick={onToggleAdvanced} aria-label="Toggle advanced options">
                {advancedOpen ? 'Hide options' : 'More options'}
              </button>
            </div>

            {advancedOpen ? (
              <>
                <label className="stack">
                  Date
                  <input aria-label="Date" type="date" value={date} onChange={(event) => onSetDate(event.target.value)} />
                </label>
                {dateError ? <p className="field-error">{dateError}</p> : null}
                <label className="stack">
                  {mode === 'expense' ? 'Merchant (optional)' : mode === 'income' ? 'Source (optional)' : 'Note (optional)'}
                  <input
                    aria-label="Note"
                    value={note}
                    onChange={(event) => onSetNote(event.target.value)}
                    placeholder={mode === 'expense' ? 'Merchant' : mode === 'income' ? 'Source' : 'Note'}
                  />
                </label>
              </>
            ) : null}

            {mode === 'transfer' ? (
              <label className="stack">
                Destination account
                <select
                  aria-label="Destination account"
                  value={transferTargetAccountId}
                  onChange={(event) => onSetTransferTarget(event.target.value)}
                >
                  <option value="">Select account</option>
                  {transferTargetOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {mode === 'expense' ? (
              <div className="stack">
                <label className="inline-checkbox">
                  <input
                    type="checkbox"
                    checked={expenseDetailed}
                    onChange={onToggleExpenseDetailed}
                  />
                  Split into items
                </label>

                {expenseDetailed ? (
                  <div className="stack item-editor">
                    <div className="inline-header">
                      <strong>Items</strong>
                      <span className={expenseRemaining === '0.00' ? 'hint success' : 'hint'}>
                        Remaining: {expenseRemaining} {currencyCode ?? ''}
                      </span>
                    </div>
                    <div className="quick-row">
                      <input
                        aria-label="Item name"
                        value={expenseItemName}
                        onChange={(event) => onSetExpenseItemName(event.target.value)}
                        placeholder="Item name"
                      />
                      <input
                        aria-label="Item amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={expenseItemAmount}
                        onChange={(event) => onSetExpenseItemAmount(event.target.value)}
                        placeholder="Amount"
                        inputMode="decimal"
                      />
                    </div>
                    {expenseItemNameError ? <p className="field-error">{expenseItemNameError}</p> : null}
                    {expenseItemAmountError ? <p className="field-error">{expenseItemAmountError}</p> : null}
                    <div className="quick-row">
                      <button type="button" className="text-button" onClick={onAddExpenseItem}>
                        Add item
                      </button>
                      <button type="button" className="text-button" onClick={onAssignRemaining}>
                        Assign remaining
                      </button>
                    </div>
                    <ul className="expense-list" aria-label="Expense items">
                      {expenseItems.map((item) => (
                        <li key={item.id} className="expense-item">
                          <div className="inline-header">
                            <strong>{item.name}</strong>
                            <span>{item.amount}</span>
                          </div>
                          <button type="button" className="text-button" onClick={() => onRemoveExpenseItem(item.id)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                    {expenseSplitError ? (
                      <p className="field-error">{expenseSplitError}</p>
                    ) : (
                      <p className="hint">Publish becomes available when Remaining is 0.00.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <button type="submit" className="primary-cta" disabled={disabled || !splitReady}>
              {submitLabel}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
