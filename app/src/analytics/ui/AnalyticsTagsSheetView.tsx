import type { AnalyticsFilterFacetTag } from '../application/analytics.port';
import { SheetView } from '../../shared/ui/SheetView';
import styles from './AnalyticsPageView.module.css';

type AnalyticsTagsSheetViewProps = {
  required: {
    data: {
      tags: AnalyticsFilterFacetTag[];
    };
    state: {
      open: boolean;
      draftTagIds: string[];
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      toggleDraftTagId: (tagId: string) => void;
      resetDraftTagIds: () => void;
      applyDraftTagIds: () => void;
    };
  };
};

export function AnalyticsTagsSheetView({ required, provided }: AnalyticsTagsSheetViewProps) {
  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Tags filter',
          panelClassName: styles.analyticsSheet,
          contentClassName: styles.analyticsSheetContent,
          showHandle: true,
        },
        data: {
          body: (
            <>
              <div className={styles.sheetHeaderRow}>
                <div className={styles.sheetIntro}>
                  <h3>Tags</h3>
                  <p>Selecciona una o más tags para filtrar.</p>
                </div>
                <button
                  type="button"
                  className={styles.sheetTextButton}
                  onClick={provided.commands.resetDraftTagIds}
                  disabled={required.status.disabled}
                >
                  Reset
                </button>
              </div>
              <div className={styles.sheetOptionList}>
                {required.data.tags.map((tag) => {
                  const selected = required.state.draftTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={styles.sheetOptionRow}
                      onClick={() => provided.commands.toggleDraftTagId(tag.id)}
                      disabled={required.status.disabled}
                      aria-pressed={selected}
                    >
                      <span className={styles.sheetOptionMain}>
                        <span className={styles.sheetOptionTitle}>{tag.name}</span>
                      </span>
                      <span className={selected ? styles.checkboxChecked : styles.checkbox} aria-hidden>
                        {selected ? <i className="bi bi-check-lg" aria-hidden /> : null}
                      </span>
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
                onClick={provided.commands.applyDraftTagIds}
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
