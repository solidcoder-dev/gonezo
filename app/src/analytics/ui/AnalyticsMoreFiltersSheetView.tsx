import type { AnalyticsFilterFacetAccount } from '../application/analytics.port';
import type { AnalyticsSharedAmountMode } from '../application/analyticsFilters';
import { SheetView } from '../../shared/ui/SheetView';
import { BinarySwitchCardView } from '../../shared/ui/BinarySwitchCard/BinarySwitchCardView';
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
      draftSharedAmountMode: AnalyticsSharedAmountMode;
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
      setDraftSharedAmountMode: (sharedAmountMode: AnalyticsSharedAmountMode) => void;
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
                  <p>Adjust extra analytics filters without changing currency, period or tags.</p>
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

              <BinarySwitchCardView
                required={{
                  config: {
                    switchId: 'analytics-include-ignored',
                    title: 'Include ignored movements',
                    description: 'Ignored movements are excluded by default.',
                    iconClassName: 'bi bi-eye-slash',
                    ariaLabel: 'Include ignored movements',
                  },
                  data: {},
                  state: { value: required.state.draftIncludeIgnoredMovements },
                  status: { disabled: required.status.disabled },
                }}
                provided={{ commands: { setValue: provided.commands.setDraftIncludeIgnoredMovements } }}
              />

              <BinarySwitchCardView
                required={{
                  config: {
                    switchId: 'analytics-full-shared-amounts',
                    title: 'Count full shared amounts',
                    description: 'Off counts only your part. On counts the full amount.',
                    iconClassName: 'bi bi-people',
                    ariaLabel: 'Count full shared amounts',
                  },
                  data: {},
                  state: { value: required.state.draftSharedAmountMode === 'full' },
                  status: { disabled: required.status.disabled },
                }}
                provided={{
                  commands: {
                    setValue: (value) => provided.commands.setDraftSharedAmountMode(value ? 'full' : 'personal'),
                  },
                }}
              />
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
