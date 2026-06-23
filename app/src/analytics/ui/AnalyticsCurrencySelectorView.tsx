import styles from './AnalyticsPageView.module.css';

export type AnalyticsCurrencySelectorViewProps = {
  required: {
    data: {
      currencies: string[];
      selectedCurrency: string;
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      selectCurrency: (currency: string) => void;
    };
  };
};

export function AnalyticsCurrencySelectorView({ required, provided }: AnalyticsCurrencySelectorViewProps) {
  if (!required.data.selectedCurrency) {
    return null;
  }

  return (
    <label className={styles.currencySelector}>
      <select
        aria-label="Analytics currency"
        value={required.data.selectedCurrency}
        disabled={required.status.disabled || required.status.loading || required.data.currencies.length <= 1}
        onChange={(event) => provided.commands.selectCurrency(event.target.value)}
      >
        {required.data.currencies.map((currency) => (
          <option key={currency} value={currency}>{currency}</option>
        ))}
      </select>
    </label>
  );
}
