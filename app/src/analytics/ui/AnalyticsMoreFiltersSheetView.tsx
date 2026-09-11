import type { AnalyticsFilterFacetAccount } from '../application/analytics.port';
import type { AnalyticsFilterFacetTag } from '../application/analytics.port';
import type { AnalyticsSharedAmountMode } from '../application/analyticsFilters';
import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsMoreFiltersSheetViewProps = {
  required: {
    data: {
      accounts: AnalyticsFilterFacetAccount[];
      tags: AnalyticsFilterFacetTag[];
    };
    state: {
      open: boolean;
      draftAccountIds: string[];
      draftIncludeIgnoredMovements: boolean;
      draftIncludePlannedMovements: boolean;
      draftSharedAmountMode: AnalyticsSharedAmountMode;
      draftTagIds: string[];
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
      setDraftIncludePlannedMovements: (includePlannedMovements: boolean) => void;
      setDraftSharedAmountMode: (sharedAmountMode: AnalyticsSharedAmountMode) => void;
      toggleDraftTagId: (tagId: string) => void;
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
                  <p>Adjust accounts, tags, and advanced analytics filters.</p>
                </div>
                <button
                  type="button"
                  className={`btn btn-outline-secondary ${styles.sheetTextButton}`}
                  onClick={provided.commands.resetMoreFiltersDraft}
                  disabled={required.status.disabled}
                >
                  Reset
                </button>
              </div>

              <div className={styles.moreFiltersSection}>
                <span className={styles.moreFiltersLabel}>Tags</span>
                <div className="d-grid gap-2">
                  {required.data.tags.map((tag) => {
                    const selected = required.state.draftTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className="btn btn-link d-flex align-items-center justify-content-between text-start text-decoration-none p-2"
                        onClick={() => provided.commands.toggleDraftTagId(tag.id)}
                        disabled={required.status.disabled}
                        aria-pressed={selected}
                      >
                        <span>{tag.name}</span>
                        <i className={selected ? 'bi bi-check-square-fill' : 'bi bi-square'} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.moreFiltersSection}>
                <span className={styles.moreFiltersLabel}>Accounts</span>
                  <label className={`${styles.accountSelectField} form-label`}>
                  <i className="bi bi-wallet2" aria-hidden />
                  <select
                    className="form-select"
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

              <FilterSwitchRow id="analytics-include-ignored" title="Include ignored movements" description="Ignored movements are excluded by default." value={required.state.draftIncludeIgnoredMovements} disabled={required.status.disabled} onChange={provided.commands.setDraftIncludeIgnoredMovements} />
              <FilterSwitchRow id="analytics-include-planned" title="Include planned movements" ariaLabel="Include scheduled and expected movements" description="Include pending expected movements and future scheduled occurrences." value={required.state.draftIncludePlannedMovements} disabled={required.status.disabled} onChange={provided.commands.setDraftIncludePlannedMovements} />
              <FilterSwitchRow id="analytics-full-shared-amounts" title="Count full shared amounts" description="Off counts only your part. On counts the full amount." value={required.state.draftSharedAmountMode === 'full'} disabled={required.status.disabled} onChange={(value) => provided.commands.setDraftSharedAmountMode(value ? 'full' : 'personal')} />
            </>
          ),
          footer: (
            <div className={styles.sheetActionFooter}>
              <button
                type="button"
                className={`btn btn-primary ${styles.applyFiltersButton}`}
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

function FilterSwitchRow({ id, title, ariaLabel = title, description, value, disabled, onChange }: { id: string; title: string; ariaLabel?: string; description: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className={styles.filterSwitchRow} htmlFor={id}><span><strong>{title}</strong><small>{description}</small></span><span className="form-check form-switch"><input id={id} aria-label={ariaLabel} role="switch" className="form-check-input" type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></span></label>;
}
