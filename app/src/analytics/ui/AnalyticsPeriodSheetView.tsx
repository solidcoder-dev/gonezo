import type { AnalyticsPeriodPreset } from '../application/analyticsFilters';
import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsPeriodSheetViewProps = {
  required: {
    state: {
      open: boolean;
      draftPeriod: AnalyticsPeriodPreset;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      setDraftPeriod: (period: AnalyticsPeriodPreset) => void;
      applyDraftPeriod: () => void;
    };
  };
};

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriodPreset; label: string; description: string }> = [
  { value: '7D', label: '7D', description: 'Last 7 days' },
  { value: '30D', label: '30D', description: 'Last 30 days' },
  { value: '90D', label: '90D', description: 'Last 90 days' },
  { value: '1Y', label: '1Y', description: 'Last year' },
  { value: 'ALL', label: 'All', description: 'All time' },
];

export function AnalyticsPeriodSheetView({ required, provided }: AnalyticsPeriodSheetViewProps) {
  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Period filter',
          panelClassName: styles.analyticsSheet,
          contentClassName: styles.analyticsSheetContent,
          showHandle: true,
        },
        data: {
          body: (
            <>
              <div className={styles.sheetIntro}>
                <h3>Periodo</h3>
                <p>Elige el periodo de tiempo para tus análisis.</p>
              </div>
              <div className={styles.sheetOptionList}>
                {PERIOD_OPTIONS.map((period) => {
                  const selected = period.value === required.state.draftPeriod;
                  return (
                    <button
                      key={period.value}
                      type="button"
                      className={styles.sheetOptionRow}
                      onClick={() => provided.commands.setDraftPeriod(period.value)}
                      disabled={required.status.disabled}
                      aria-pressed={selected}
                    >
                      <span className={styles.sheetOptionMain}>
                        <span className={styles.sheetOptionTitle}>{period.label}</span>
                        <span className={styles.sheetOptionDescription}>{period.description}</span>
                      </span>
                      <span className={selected ? styles.radioChecked : styles.radio} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </>
          ),
          footer: (
            <div className={styles.sheetActionFooter}>
              <button
                type="button"
                className={styles.applyFiltersButton}
                onClick={provided.commands.applyDraftPeriod}
                disabled={required.status.disabled}
              >
                Apply
              </button>
            </div>
          ),
        },
        state: { open: required.state.open },
        status: { disabled: required.status.disabled },
      }}
      provided={{ commands: { close: provided.commands.close } }}
    />
  );
}
