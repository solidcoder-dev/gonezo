import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import { movementDetailAmountLabel, movementDetailTypeLabel } from '../../application/movementDetailMappers';
import type { MovementDetailOverflowAction, MovementDetailTagView, MovementDetailViewModel } from '../../application/movementDetailView.types';
import styles from './MovementDetailSummaryView.module.css';

type MovementDetailSummaryViewProps = {
  movement: MovementDetailViewModel;
  overflowActions: MovementDetailOverflowAction[];
  overflowOpen: boolean;
  pendingVoid: boolean;
  deactivating: boolean;
  dismissingExpected?: boolean;
  onGoBack: () => void;
  onToggleOverflow: () => void;
  onRunOverflowAction: (action: MovementDetailOverflowAction) => void;
  onOpenCategorySheet: () => void;
  onOpenTagsSheet: () => void;
  onOpenSharingSheet: () => void;
  onOpenItemsSheet: () => void;
  onOpenMoreDetailsSheet: () => void;
};

function summaryTags(tags: MovementDetailTagView[]) {
  if (tags.length === 0) {
    return <span className={styles.placeholder}>No tags</span>;
  }

  return (
    <span className={styles.chipList}>
      {tags.map((tag) => (
        <span key={tag.id ?? tag.name} className={styles.chip}>
          {tag.name}
        </span>
      ))}
    </span>
  );
}

export function MovementDetailSummaryHeaderView(props: MovementDetailSummaryViewProps) {
  const {
    overflowActions = [],
    overflowOpen,
    pendingVoid,
    deactivating,
    dismissingExpected = false,
    onGoBack,
    onToggleOverflow,
    onRunOverflowAction,
  } = props;

  return (
    <div className={styles.header}>
      <button
        type="button"
        className="gz-text-button gz-icon-button"
        aria-label="Back to movements"
        onClick={onGoBack}
      >
        <i className="bi bi-arrow-left" aria-hidden />
      </button>
      <h2 className={styles.headerTitle}>Movement</h2>
      <div>
        {overflowActions.length > 0 ? (
          <button
            type="button"
            className="gz-text-button gz-icon-button"
            aria-label="Movement actions"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={onToggleOverflow}
          >
            <i className="bi bi-three-dots" aria-hidden />
          </button>
        ) : null}
      </div>
      {overflowOpen && overflowActions.length > 0 ? (
        <div className={styles.overflow} role="menu" aria-label="Movement actions">
          {overflowActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`${styles.overflowAction} ${action.destructive ? styles.overflowActionDestructive : ''}`}
              role="menuitem"
              onClick={() => onRunOverflowAction(action)}
              disabled={(action.id === 'void-posted' && pendingVoid) || (action.id === 'stop-recurring-series' && deactivating) || (action.id === 'dismiss-expected' && dismissingExpected)}
            >
              {(action.id === 'void-posted' && pendingVoid) || (action.id === 'stop-recurring-series' && deactivating) || (action.id === 'dismiss-expected' && dismissingExpected)
                ? 'Pending...'
                : action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MovementDetailSummaryBodyView(props: MovementDetailSummaryViewProps) {
  const {
    movement,
    onOpenCategorySheet,
    onOpenTagsSheet,
    onOpenSharingSheet,
    onOpenItemsSheet,
    onOpenMoreDetailsSheet,
  } = props;
  const showCategory = movement.financialType !== 'transfer' && (movement.canEditCategory || movement.category != null);
  const showTags = ('canEditTags' in movement && movement.canEditTags) || movement.tags.length > 0 || movement.source === 'expected';
  const canEditTags = 'canEditTags' in movement && movement.canEditTags;
  const showSharing = movement.source === 'posted'
    && movement.financialType === 'expense'
    && (
      movement.sharing.phase === 'loading'
      || movement.sharing.phase === 'error'
      || (movement.sharing.phase === 'loaded' && movement.sharing.value != null)
    );
  const showItems = movement.items.length > 0;
  const sharingValue = movement.source === 'posted' && movement.sharing.phase === 'loaded'
    ? movement.sharing.value
    : null;
  return (
    <div className={styles.body}>
      <div className={styles.context}>
        <span className={`${styles.type} ${styles[movement.financialType]}`}>{movementDetailTypeLabel(movement.financialType)}</span>
        <span className={styles.account}>{movement.accountLabel}</span>
      </div>
      <strong className={styles.amount}>{`${movement.amount.sign}${movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}`}</strong>
      <div className={styles.identity}>
        <h3 className={styles.title}>{movement.title}</h3>
        <span className={styles.meta}>{movement.dateLabel}</span>
        {'lifecycleChip' in movement && movement.lifecycleChip ? <span className={styles.status}>{movement.lifecycleChip}</span> : null}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Classification</span>
        <div>
          {showCategory && movement.canEditCategory ? (
            <button type="button" className={styles.row} onClick={onOpenCategorySheet}>
              <span className={styles.rowMain}>Category</span>
              <span className={styles.rowValue}>
                <span className={movement.category ? undefined : styles.placeholder}>
                  {movement.category?.name ?? 'No category'}
                </span>
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          {showCategory && !movement.canEditCategory ? (
            <div className={styles.row}>
              <span className={styles.rowMain}>Category</span>
              <span className={styles.rowValue}>
                <span className={movement.category ? undefined : styles.placeholder}>
                  {movement.category?.name ?? 'No category'}
                </span>
              </span>
            </div>
          ) : null}
          {showTags && canEditTags ? (
            <button type="button" className={styles.row} onClick={onOpenTagsSheet}>
              <span className={styles.rowMain}>Tags</span>
              <span className={styles.rowValue}>
                {summaryTags(movement.tags)}
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          {showTags && !canEditTags ? (
            <div className={styles.row}>
              <span className={styles.rowMain}>Tags</span>
              <span className={styles.rowValue}>
                {summaryTags(movement.tags)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Details</span>
        <div>
          {showSharing ? (
            <button type="button" className={styles.row} onClick={onOpenSharingSheet}>
              <span className={styles.rowMain}>
                <span>
                  {movement.sharing.phase === 'error'
                    ? 'Sharing unavailable'
                    : movement.sharing.phase === 'loading'
                      ? 'Loading sharing...'
                      : `Shared with ${sharingValue?.participantCount ?? 0} people`}
                </span>
                {sharingValue ? (
                  <small className={styles.supporting}>Your share · {formatCurrencyAmount(sharingValue.personalExpenseAmount, movement.amount.currency)}</small>
                ) : null}
              </span>
              <span className={styles.rowValue}>
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          {showItems ? (
            <button type="button" className={styles.row} onClick={onOpenItemsSheet}>
              <span className={styles.rowMain}>
                <span>Items</span>
                <small className={styles.supporting}>{movement.items.length} items · {movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}</small>
              </span>
              <span className={styles.rowValue}>
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          <button type="button" className={styles.row} onClick={onOpenMoreDetailsSheet}>
            <span className={styles.rowMain}>More details</span>
            <span className={styles.rowValue}>
              <i className="bi bi-chevron-right" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
