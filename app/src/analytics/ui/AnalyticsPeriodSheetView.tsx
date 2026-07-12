import type { AnalyticsLocalDate, AnalyticsPeriod } from '../application/analyticsFilters';
import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsPeriodSheetViewProps = {
  required: {
    state: {
      open: boolean;
      draftPeriod: AnalyticsPeriod;
      draftCustomFrom: AnalyticsLocalDate;
      draftCustomTo: AnalyticsLocalDate;
      draftPeriodError?: string;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      setDraftPeriod: (period: AnalyticsPeriod) => void;
      setDraftCustomFrom: (from: AnalyticsLocalDate) => void;
      setDraftCustomTo: (to: AnalyticsLocalDate) => void;
      applyDraftPeriod: () => void;
    };
  };
};

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string; description: string }> = [
  { value: { kind: 'thisMonth' }, label: 'This month', description: 'From the first day of this month until today.' },
  { value: { kind: 'lastMonth' }, label: 'Last month', description: 'The complete previous calendar month.' },
  { value: { kind: 'rollingDays', days: 30, anchorDate: '2000-01-01' }, label: 'Last 30 days', description: 'A rolling 30-day range ending today.' },
  { value: { kind: 'rollingMonths', months: 3, anchorDate: '2000-01-01' }, label: 'Last 3 months', description: 'The current month plus the two previous months.' },
  { value: { kind: 'thisYear' }, label: 'This year', description: 'From January 1 until today.' },
  { value: { kind: 'custom', from: '2000-01-01', to: '2000-01-01' }, label: 'Custom', description: 'Choose an inclusive date range.' },
  { value: { kind: 'allTime' }, label: 'All time', description: 'All posted history, without comparison.' },
];

function isSelected(left: AnalyticsPeriod, right: AnalyticsPeriod): boolean {
  return left.kind === right.kind;
}

export function AnalyticsPeriodSheetView({ required, provided }: AnalyticsPeriodSheetViewProps) {
  const customSelected = required.state.draftPeriod.kind === 'custom';

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
                <h3>Period</h3>
                <p>Choose the time range used across your analytics.</p>
              </div>
              <div className={styles.sheetOptionList}>
                {PERIOD_OPTIONS.map((period) => {
                  const selected = isSelected(period.value, required.state.draftPeriod);
                  return (
                    <button
                      key={period.label}
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
              {customSelected ? (
                <div className={styles.periodCustomRange}>
                  <label className={styles.periodDateField}>
                    <span>From</span>
                    <input
                      type="date"
                      aria-label="Custom period from"
                      value={required.state.draftCustomFrom}
                      onChange={(event) => provided.commands.setDraftCustomFrom(event.target.value)}
                      disabled={required.status.disabled}
                    />
                  </label>
                  <label className={styles.periodDateField}>
                    <span>To</span>
                    <input
                      type="date"
                      aria-label="Custom period to"
                      value={required.state.draftCustomTo}
                      onChange={(event) => provided.commands.setDraftCustomTo(event.target.value)}
                      disabled={required.status.disabled}
                    />
                  </label>
                  {required.state.draftPeriodError ? <p className={styles.periodError}>{required.state.draftPeriodError}</p> : null}
                </div>
              ) : null}
            </>
          ),
          footer: (
            <div className={styles.sheetActionFooter}>
              <button
                type="button"
                className={styles.applyFiltersButton}
                onClick={provided.commands.applyDraftPeriod}
                disabled={required.status.disabled || Boolean(required.state.draftPeriodError)}
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
