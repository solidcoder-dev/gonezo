export interface CounterpartyFieldProps {
  transactionType: 'expense' | 'income' | 'transfer';
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function CounterpartyField({ transactionType, value, disabled, onChange }: CounterpartyFieldProps) {
  return (
    <input
      aria-label="Source or merchant"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={
        transactionType === 'income'
          ? 'Source (optional)'
          : transactionType === 'transfer'
            ? 'Note (optional)'
            : 'Merchant (optional)'
      }
      disabled={disabled}
    />
  );
}
