import type {
  AnalyticsFilterFacetAccount,
  AnalyticsFilterFacetTag,
} from '../application/analytics.port';
import type {
  AnalyticsFilters,
  AnalyticsFiltersInput,
  AnalyticsMovementTypeFilter,
  AnalyticsPeriodPreset,
  AnalyticsViewMode,
} from '../application/analyticsFilters';
import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsFilterBarViewProps = {
  required: {
    data: {
      currencies: string[];
      accounts: AnalyticsFilterFacetAccount[];
      tags: AnalyticsFilterFacetTag[];
      selectedTags: AnalyticsFilterFacetTag[];
    };
    state: {
      filters: AnalyticsFilters;
      draftFilters: AnalyticsFilters;
      draftTagIds: string[];
      tagQuery: string;
      currencySheetOpen: boolean;
      periodSheetOpen: boolean;
      tagSheetOpen: boolean;
      moreFiltersOpen: boolean;
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      openCurrencySheet: () => void;
      closeCurrencySheet: () => void;
      selectCurrency: (currency: string) => void;
      openPeriodSheet: () => void;
      closePeriodSheet: () => void;
      selectPeriod: (period: AnalyticsPeriodPreset) => void;
      removeTag: (tagId: string) => void;
      openTagSheet: () => void;
      closeTagSheet: () => void;
      setTagQuery: (query: string) => void;
      toggleDraftTag: (tagId: string) => void;
      clearDraftTags: () => void;
      applyDraftTags: () => void;
      openMoreFilters: () => void;
      closeMoreFilters: () => void;
      patchDraftFilters: (patch: AnalyticsFiltersInput) => void;
      selectDraftAccount: (accountId: string) => void;
      resetDraftFilters: () => void;
      applyDraftFilters: () => void;
    };
  };
};

const PERIODS: Array<{ value: AnalyticsPeriodPreset; label: string }> = [
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: '5Y', label: '5Y' },
  { value: 'ALL', label: 'All period' },
];

const MOVEMENT_TYPES: Array<{ value: AnalyticsMovementTypeFilter; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

function toggleIdentifier(values: string[], candidate: string): string[] {
  return values.includes(candidate)
    ? values.filter((value) => value !== candidate)
    : [...values, candidate];
}

function toggleMovementType(
  values: AnalyticsMovementTypeFilter[],
  candidate: AnalyticsMovementTypeFilter,
): AnalyticsMovementTypeFilter[] {
  return values.includes(candidate)
    ? values.filter((value) => value !== candidate)
    : [...values, candidate];
}

function tagChipLabel(selectedTags: AnalyticsFilterFacetTag[]): string {
  if (selectedTags.length === 0) {
    return 'Tags';
  }
  if (selectedTags.length === 1) {
    return `#${selectedTags[0].name}`;
  }
  return `${selectedTags.length} tags`;
}

function activeMoreFilterCount(filters: AnalyticsFilters): number {
  return [
    filters.accountIds.length > 0,
    filters.movementTypes.length > 0,
  ].filter(Boolean).length;
}

function periodLabel(period: AnalyticsPeriodPreset): string {
  return PERIODS.find((option) => option.value === period)?.label ?? period;
}

export function AnalyticsFilterBarView({ required, provided }: AnalyticsFilterBarViewProps) {
  const { data, state, status } = required;
  const disabled = status.disabled || status.loading;
  const moreFilterCount = activeMoreFilterCount(state.filters);
  const tagChipActive = data.selectedTags.length > 0;

  return (
    <>
      <div className={styles.filterBar} aria-label="Analytics filters">
        <button
          type="button"
          className={state.filters.currency ? styles.filterChip : styles.filterChipMuted}
          onClick={provided.commands.openCurrencySheet}
          disabled={disabled}
          aria-label="Select currency"
        >
          <i className="bi bi-globe2" aria-hidden />
          <span>{state.filters.currency || 'Currency'}</span>
          <i className="bi bi-chevron-down" aria-hidden />
        </button>

        <button
          type="button"
          className={styles.filterChip}
          onClick={provided.commands.openPeriodSheet}
          disabled={disabled}
          aria-label="Select period"
        >
          <i className="bi bi-calendar4" aria-hidden />
          <span>{periodLabel(state.filters.period)}</span>
          <i className="bi bi-chevron-down" aria-hidden />
        </button>

        <button
          type="button"
          className={tagChipActive ? styles.filterChipActive : styles.filterChip}
          onClick={provided.commands.openTagSheet}
          disabled={disabled}
          aria-label="Select tags"
        >
          <i className="bi bi-tag" aria-hidden />
          <span>{tagChipLabel(data.selectedTags)}</span>
          {tagChipActive && data.selectedTags.length === 1 ? (
            <i className="bi bi-x" aria-hidden />
          ) : (
            <i className="bi bi-chevron-down" aria-hidden />
          )}
        </button>

        <button
          type="button"
          className={moreFilterCount > 0 ? styles.moreFiltersButtonActive : styles.moreFiltersButton}
          onClick={provided.commands.openMoreFilters}
          disabled={disabled}
          aria-label="More filters"
        >
          <i className="bi bi-sliders2" aria-hidden />
          {moreFilterCount > 0 ? <span className={styles.filterBadge}>{moreFilterCount}</span> : null}
        </button>
      </div>

      {data.selectedTags.length > 1 ? (
        <div className={styles.selectedTagRow} aria-label="Selected analytics tags">
          {data.selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={styles.selectedTagChip}
              onClick={() => provided.commands.removeTag(tag.id)}
              disabled={disabled}
              aria-label={`Remove tag ${tag.name}`}
            >
              <span>#{tag.name}</span>
              <i className="bi bi-x" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      <SheetView
        required={{
          config: {
            ariaLabel: 'Select currency',
            panelClassName: styles.analyticsSheet,
            contentClassName: styles.analyticsSheetContent,
            showHandle: true,
          },
          data: {
            header: (
              <div className={styles.sheetHeader}>
                <h3>Select currency</h3>
              </div>
            ),
            body: (
              <div className={styles.optionList}>
                {data.currencies.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    className={currency === state.filters.currency ? styles.optionRowActive : styles.optionRow}
                    onClick={() => provided.commands.selectCurrency(currency)}
                  >
                    <span>{currency}</span>
                    {currency === state.filters.currency ? <i className="bi bi-check-lg" aria-hidden /> : null}
                  </button>
                ))}
              </div>
            ),
          },
          state: { open: state.currencySheetOpen },
          status: {},
        }}
        provided={{ commands: { close: provided.commands.closeCurrencySheet } }}
      />

      <SheetView
        required={{
          config: {
            ariaLabel: 'Select period',
            panelClassName: styles.analyticsSheet,
            contentClassName: styles.analyticsSheetContent,
            showHandle: true,
          },
          data: {
            header: (
              <div className={styles.sheetHeader}>
                <h3>Select period</h3>
              </div>
            ),
            body: (
              <div className={styles.optionList}>
                {PERIODS.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    className={period.value === state.filters.period ? styles.optionRowActive : styles.optionRow}
                    onClick={() => provided.commands.selectPeriod(period.value)}
                  >
                    <span>{period.label}</span>
                    {period.value === state.filters.period ? <i className="bi bi-check-lg" aria-hidden /> : null}
                  </button>
                ))}
              </div>
            ),
          },
          state: { open: state.periodSheetOpen },
          status: {},
        }}
        provided={{ commands: { close: provided.commands.closePeriodSheet } }}
      />

      <SheetView
        required={{
          config: {
            ariaLabel: 'Select tags',
            panelClassName: styles.analyticsSheet,
            contentClassName: styles.analyticsSheetContent,
            showHandle: true,
          },
          data: {
            header: (
              <div className={styles.sheetHeader}>
                <h3>Select tags</h3>
                <button type="button" className={styles.sheetDoneButton} onClick={provided.commands.clearDraftTags}>
                  Clear
                </button>
              </div>
            ),
            body: (
              <>
                <label className={styles.searchField}>
                  <i className="bi bi-search" aria-hidden />
                  <input
                    type="search"
                    aria-label="Search tags"
                    placeholder="Search tags..."
                    value={state.tagQuery}
                    onChange={(event) => provided.commands.setTagQuery(event.target.value)}
                  />
                </label>
                <div className={styles.tagOptionList}>
                  {data.tags.map((tag) => {
                    const selected = state.draftTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={styles.tagOption}
                        onClick={() => provided.commands.toggleDraftTag(tag.id)}
                        aria-pressed={selected}
                      >
                        <span>#{tag.name}</span>
                        <span className={selected ? styles.checkboxChecked : styles.checkbox}>
                          {selected ? <i className="bi bi-check-lg" aria-hidden /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ),
            footer: (
              <div className={styles.tagSheetFooter}>
                <strong>{state.draftTagIds.length} tags selected</strong>
                <button type="button" className={styles.tagDoneButton} onClick={provided.commands.applyDraftTags}>
                  Done
                </button>
              </div>
            ),
          },
          state: { open: state.tagSheetOpen },
          status: {},
        }}
        provided={{ commands: { close: provided.commands.closeTagSheet } }}
      />

      <SheetView
        required={{
          config: {
            ariaLabel: 'Analytics filters',
            panelClassName: styles.analyticsSheet,
            contentClassName: styles.analyticsSheetContent,
          },
          data: {
            header: (
              <div className={styles.sheetHeader}>
                <h3>Filters</h3>
                <button type="button" className={styles.sheetDoneButton} onClick={provided.commands.resetDraftFilters}>
                  Reset
                </button>
              </div>
            ),
            body: (
              <div className={styles.filterRows}>
                <label className={styles.filterRow}>
                  <span>Account</span>
                  <select
                    aria-label="Analytics account"
                    value={state.draftFilters.accountIds[0] ?? ''}
                    onChange={(event) => provided.commands.selectDraftAccount(event.target.value)}
                  >
                    <option value="">All accounts</option>
                    {data.accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </label>

                <div className={styles.filterRowGroup}>
                  <span>Movement type</span>
                  <div className={styles.segmentedControls}>
                    {MOVEMENT_TYPES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={state.draftFilters.movementTypes.includes(option.value) ? styles.segmentActive : styles.segment}
                        onClick={() => provided.commands.patchDraftFilters({
                          movementTypes: toggleMovementType(state.draftFilters.movementTypes, option.value),
                        })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.filterRowGroup}>
                  <span>Tags</span>
                  <div className={styles.compactChipRow}>
                    {data.tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={state.draftFilters.tagIds.includes(tag.id) ? styles.compactChipActive : styles.compactChip}
                        onClick={() => provided.commands.patchDraftFilters({
                          tagIds: toggleIdentifier(state.draftFilters.tagIds, tag.id),
                        })}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ),
            footer: (
              <button type="button" className={styles.applyFiltersButton} onClick={provided.commands.applyDraftFilters}>
                Apply filters
              </button>
            ),
          },
          state: { open: state.moreFiltersOpen },
          status: {},
        }}
        provided={{ commands: { close: provided.commands.closeMoreFilters } }}
      />
    </>
  );
}

export type AnalyticsViewTabsViewProps = {
  required: {
    state: {
      viewMode: AnalyticsViewMode;
    };
  };
  provided: {
    commands: {
      selectViewMode: (viewMode: AnalyticsViewMode) => void;
    };
  };
};

const VIEW_TABS: Array<{ value: AnalyticsViewMode; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'spending', label: 'Spending' },
  { value: 'cashFlow', label: 'Cash flow' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'accounts', label: 'Accounts' },
];

export function AnalyticsViewTabsView({ required, provided }: AnalyticsViewTabsViewProps) {
  return (
    <div className={styles.viewTabs} role="tablist" aria-label="Analytics views">
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={required.state.viewMode === tab.value ? styles.viewTabActive : styles.viewTab}
          role="tab"
          aria-selected={required.state.viewMode === tab.value}
          onClick={() => provided.commands.selectViewMode(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
