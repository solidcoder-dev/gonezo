import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsCurrencySheetViewProps = {
  required: {
    data: {
      currencies: string[];
    };
    state: {
      open: boolean;
      draftCurrency: string;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      setDraftCurrency: (currency: string) => void;
      applyDraftCurrency: () => void;
    };
  };
};

export function AnalyticsCurrencySheetView({ required, provided }: AnalyticsCurrencySheetViewProps) {
  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Currency filter',
          panelClassName: styles.analyticsSheet,
          contentClassName: styles.analyticsSheetContent,
          showHandle: true,
        },
        data: {
          body: (
            <>
              <div className={styles.sheetIntro}>
                <h3>Divisa</h3>
                <p>Selecciona la divisa para ver tus análisis.</p>
              </div>
              <div className={styles.sheetOptionList}>
                {required.data.currencies.map((currency) => {
                  const selected = currency === required.state.draftCurrency;
                  return (
                    <button
                      key={currency}
                      type="button"
                      className={styles.sheetOptionRow}
                      onClick={() => provided.commands.setDraftCurrency(currency)}
                      disabled={required.status.disabled}
                      aria-pressed={selected}
                    >
                      <span className={styles.sheetOptionMain}>
                        <span className={styles.sheetOptionTitle}>{currency}</span>
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
                onClick={provided.commands.applyDraftCurrency}
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
