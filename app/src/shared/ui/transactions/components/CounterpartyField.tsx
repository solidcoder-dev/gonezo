export type CounterpartyFieldRequired = {
  transactionType: 'expense' | 'income' | 'transfer';
  value: string;
  disabled: boolean;
};

export type CounterpartyFieldProvided = {
  onChange: (value: string) => void;
};

export type CounterpartyFieldProps = {
  required: CounterpartyFieldRequired;
  provided: CounterpartyFieldProvided;
};

export function CounterpartyField({ required, provided }: CounterpartyFieldProps) {
  return (
    <input
      aria-label="Source or merchant"
      value={required.value}
      onChange={(event) => provided.onChange(event.target.value)}
      placeholder={
        required.transactionType === 'income'
          ? 'Source (optional)'
          : required.transactionType === 'transfer'
            ? 'Note (optional)'
            : 'Merchant (optional)'
      }
      disabled={required.disabled}
    />
  );
}
