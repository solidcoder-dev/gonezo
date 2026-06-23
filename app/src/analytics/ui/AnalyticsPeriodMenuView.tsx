import type { LedgerCashFlowGranularity } from '../../ledger/application/ledger.port';
import styles from './AnalyticsPeriodMenuView.module.css';

const GRANULARITIES: Array<{ value: LedgerCashFlowGranularity; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export type AnalyticsPeriodMenuViewProps = {
  required: {
    state: {
      granularity: LedgerCashFlowGranularity;
    };
    status: {
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      selectGranularity: (granularity: LedgerCashFlowGranularity) => void;
    };
  };
};

export function AnalyticsPeriodMenuView({ required, provided }: AnalyticsPeriodMenuViewProps) {
  return (
    <details className={styles.menu}>
      <summary
        aria-label="Select period"
        aria-disabled={required.status.disabled}
        className={styles.trigger}
        role="button"
      >
        <i className="bi bi-three-dots" aria-hidden />
      </summary>
      <div className={styles.panel} role="menu">
        {GRANULARITIES.map((granularity) => (
          <button
            key={granularity.value}
            type="button"
            className={styles.option}
            role="menuitemradio"
            aria-pressed={granularity.value === required.state.granularity}
            disabled={required.status.disabled}
            onClick={() => provided.commands.selectGranularity(granularity.value)}
          >
            <span>{granularity.label}</span>
            {granularity.value === required.state.granularity ? <i className="bi bi-check-lg" aria-hidden /> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
