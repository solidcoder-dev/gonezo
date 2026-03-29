type TransactionType = 'expense' | 'income' | 'transfer';

export type TransactionTypeToggleRequired = {
  value: TransactionType;
  disabled: boolean;
};

export type TransactionTypeToggleProvided = {
  onChange: (value: TransactionType) => void;
};

export type TransactionTypeToggleProps = {
  required: TransactionTypeToggleRequired;
  provided: TransactionTypeToggleProvided;
};

export function TransactionTypeToggle({ required, provided }: TransactionTypeToggleProps) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Transaction type">
      <button
        type="button"
        role="radio"
        aria-checked={required.value === 'expense'}
        className={required.value === 'expense' ? 'segment active' : 'segment'}
        disabled={required.disabled}
        onClick={() => provided.onChange('expense')}
      >
        Expense
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={required.value === 'income'}
        className={required.value === 'income' ? 'segment active' : 'segment'}
        disabled={required.disabled}
        onClick={() => provided.onChange('income')}
      >
        Income
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={required.value === 'transfer'}
        className={required.value === 'transfer' ? 'segment active' : 'segment'}
        disabled={required.disabled}
        onClick={() => provided.onChange('transfer')}
      >
        Transfer
      </button>
    </div>
  );
}
