import type { TransactionType } from '../../accounts/useAccountsPageModel';

export interface TransactionTypeToggleProps {
  value: TransactionType;
  disabled: boolean;
  onChange: (value: TransactionType) => void;
}

export function TransactionTypeToggle({ value, disabled, onChange }: TransactionTypeToggleProps) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Transaction type">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'expense'}
        className={value === 'expense' ? 'segment active' : 'segment'}
        disabled={disabled}
        onClick={() => onChange('expense')}
      >
        Expense
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'income'}
        className={value === 'income' ? 'segment active' : 'segment'}
        disabled={disabled}
        onClick={() => onChange('income')}
      >
        Income
      </button>
    </div>
  );
}
