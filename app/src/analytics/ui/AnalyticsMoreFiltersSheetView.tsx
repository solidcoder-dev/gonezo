import type { AnalyticsFilterFacetAccount } from '../application/analytics.port';
import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsMoreFiltersSheetViewProps = {
  required: {
    data: {
      accounts: AnalyticsFilterFacetAccount[];
    };
    state: {
      open: boolean;
      draftAccountIds: string[];
      draftIncludeIgnoredMovements: boolean;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      setDraftAccountIds: (accountIds: string[]) => void;
      setDraftIncludeIgnoredMovements: (includeIgnoredMovements: boolean) => void;
      resetMoreFiltersDraft: () => void;
      applyMoreFiltersDraft: () => void;
    };
  };
};

export function AnalyticsMoreFiltersSheetView({ required, provided }: AnalyticsMoreFiltersSheetViewProps) {
  const selectedAccountId = required.state.draftAccountIds[0] ?? '';

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'More analytics filters',
          panelClassName: styles.analyticsSheet,
          contentClassName: styles.analyticsSheetContent,
          showHandle: true,
        },
        data: {
          body: (
            <>
              <div className={styles.sheetHeaderRow}>
                <div className={styles.sheetIntro}>
                  <h3>More filters</h3>
                  <p>Ajustes adicionales para tus análisis.</p>
                </div>
                <button
                  type="button"
                  className={styles.sheetTextButton}
                  onClick={provided.commands.resetMoreFiltersDraft}
                  disabled={required.status.disabled}
                >
                  Reset
                </button>
              </div>

              <div className={styles.moreFiltersSection}>
                <span className={styles.moreFiltersLabel}>Accounts</span>
                <label className={styles.accountSelectField}>
                  <i className="bi bi-wallet2" aria-hidden />
                  <select
                    aria-label="Analytics account"
                    value={selectedAccountId}
                    onChange={(event) => provided.commands.setDraftAccountIds(
                      event.target.value ? [event.target.value] : [],
                    )}
                    disabled={required.status.disabled}
                  >
                    <option value="">All accounts</option>
                    {required.data.accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.toggleRow}>
                <div className={styles.toggleCopy}>
                  <span className={styles.moreFiltersLabel}>Include ignored movements</span>
                  <span className={styles.toggleDescription}>
                    Ignored income and expenses will be included in analytics.
                  </span>
                </div>
                <button
                  type="button"
                  className={required.state.draftIncludeIgnoredMovements ? styles.toggleSwitchOn : styles.toggleSwitch}
                  aria-label="Include ignored movements"
                  aria-pressed={required.state.draftIncludeIgnoredMovements}
                  onClick={() => provided.commands.setDraftIncludeIgnoredMovements(!required.state.draftIncludeIgnoredMovements)}
                  disabled={required.status.disabled}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </label>
            </>
          ),
          footer: (
            <div className={styles.sheetActionFooter}>
              <button
                type="button"
                className={styles.applyFiltersButton}
                onClick={provided.commands.applyMoreFiltersDraft}
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
