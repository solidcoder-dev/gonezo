import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import {
  movementDetailAmountLabel,
  movementDetailIconClassName,
  movementDetailTypeLabel,
} from '../../application/movementDetailMappers';
import type { MovementDetailTagView, MovementDetailViewModel } from '../../application/movementDetailView.types';

type MovementDetailSummaryViewProps = {
  movement: MovementDetailViewModel;
  overflowActionLabel?: string;
  overflowOpen: boolean;
  pendingVoid: boolean;
  deactivating: boolean;
  onGoBack: () => void;
  onToggleOverflow: () => void;
  onRunOverflowAction: () => void;
  onOpenCategorySheet: () => void;
  onOpenTagsSheet: () => void;
  onOpenSharingSheet: () => void;
  onOpenItemsSheet: () => void;
  onOpenMoreDetailsSheet: () => void;
};

function summaryTags(tags: MovementDetailTagView[]) {
  if (tags.length === 0) {
    return <span className="movement-detail-placeholder">No tags</span>;
  }

  return (
    <span className="movement-detail-chip-list movement-detail-chip-list--wrap">
      {tags.map((tag) => (
        <span key={tag.id ?? tag.name} className="movement-detail-chip">
          {tag.name}
        </span>
      ))}
    </span>
  );
}

function overflowLabel(
  actionLabel: string | undefined,
  pendingVoid: boolean,
  deactivating: boolean,
): string | undefined {
  if (!actionLabel) {
    return undefined;
  }
  if (pendingVoid) {
    return 'Pending...';
  }
  if (deactivating) {
    return 'Deactivating...';
  }
  return actionLabel;
}

export function MovementDetailSummaryHeaderView(props: MovementDetailSummaryViewProps) {
  const {
    overflowActionLabel,
    overflowOpen,
    pendingVoid,
    deactivating,
    onGoBack,
    onToggleOverflow,
    onRunOverflowAction,
  } = props;
  const overflowAction = overflowLabel(overflowActionLabel, pendingVoid, deactivating);

  return (
    <div className="movement-detail-header">
      <button
        type="button"
        className="text-button icon-button movement-detail-header-action"
        aria-label="Back to movements"
        onClick={onGoBack}
      >
        <i className="bi bi-arrow-left" aria-hidden />
      </button>
      <h2>Movement</h2>
      <div className="movement-detail-header-side">
        {overflowActionLabel ? (
          <button
            type="button"
            className="text-button icon-button movement-detail-header-action"
            aria-label="Movement actions"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={onToggleOverflow}
          >
            <i className="bi bi-three-dots" aria-hidden />
          </button>
        ) : null}
      </div>
      {overflowOpen && overflowAction ? (
        <div className="movement-detail-overflow" role="menu" aria-label="Movement actions">
          <button
            type="button"
            className="movement-detail-overflow-action"
            role="menuitem"
            onClick={onRunOverflowAction}
            disabled={pendingVoid || deactivating}
          >
            {overflowAction}
          </button>
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
  const iconClassName = movementDetailIconClassName(movement.financialType);
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
  const showMovementSectionTitle = showSharing || showItems;
  const sharingValue = movement.source === 'posted' && movement.sharing.phase === 'loaded'
    ? movement.sharing.value
    : null;
  return (
    <div className="movement-detail-body">
      <section className={`movement-detail-hero movement-detail-hero--${movement.financialType}`}>
        <div className="movement-detail-hero-top">
          <span className="movement-detail-hero-icon">
            <i className={iconClassName} aria-hidden />
          </span>
          <div className="movement-detail-hero-copy">
            <strong>{movement.title}</strong>
            <span>{[movement.accountLabel, movement.dateLabel].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
        <div className="movement-detail-hero-bottom">
          <strong className="movement-detail-hero-amount">
            {`${movement.amount.sign}${movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}`}
          </strong>
          <div className="movement-detail-chip-list movement-detail-chip-list--wrap">
            <span className={`movement-detail-chip movement-detail-chip--tone-${movement.financialType}`}>
              {movementDetailTypeLabel(movement.financialType)}
            </span>
            {'lifecycleChip' in movement && movement.lifecycleChip ? (
              <span className="movement-detail-chip movement-detail-chip--secondary">{movement.lifecycleChip}</span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="movement-detail-section">
        <span className="movement-detail-section-title">Classification</span>
        <div className="movement-detail-group">
          {showCategory && movement.canEditCategory ? (
            <button type="button" className="movement-detail-row" onClick={onOpenCategorySheet}>
              <span className="movement-detail-row-main">
                <i className="bi bi-bookmark" aria-hidden />
                <span>Category</span>
              </span>
              <span className="movement-detail-row-value">
                <span className={movement.category ? 'movement-detail-chip movement-detail-chip--filled' : 'movement-detail-placeholder'}>
                  {movement.category?.name ?? 'No category'}
                </span>
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          {showCategory && !movement.canEditCategory ? (
            <div className="movement-detail-row movement-detail-row--static">
              <span className="movement-detail-row-main">
                <i className="bi bi-bookmark" aria-hidden />
                <span>Category</span>
              </span>
              <span className="movement-detail-row-value">
                <span className={movement.category ? 'movement-detail-chip movement-detail-chip--filled' : 'movement-detail-placeholder'}>
                  {movement.category?.name ?? 'No category'}
                </span>
              </span>
            </div>
          ) : null}
          {showTags && canEditTags ? (
            <button type="button" className="movement-detail-row" onClick={onOpenTagsSheet}>
              <span className="movement-detail-row-main">
                <i className="bi bi-tags" aria-hidden />
                <span>Tags</span>
              </span>
              <span className="movement-detail-row-value movement-detail-row-value--tags">
                {summaryTags(movement.tags)}
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          {showTags && !canEditTags ? (
            <div className="movement-detail-row movement-detail-row--static">
              <span className="movement-detail-row-main">
                <i className="bi bi-tags" aria-hidden />
                <span>Tags</span>
              </span>
              <span className="movement-detail-row-value movement-detail-row-value--tags">
                {summaryTags(movement.tags)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="movement-detail-section">
        {showMovementSectionTitle ? <span className="movement-detail-section-title">Movement</span> : null}
        <div className="movement-detail-group">
          {showSharing ? (
            <button type="button" className="movement-detail-row" onClick={onOpenSharingSheet}>
              <span className="movement-detail-row-main movement-detail-row-main--stacked">
                <span className="movement-detail-row-leading">
                  <i className="bi bi-people" aria-hidden />
                  <span>
                    {movement.sharing.phase === 'error'
                      ? 'Sharing unavailable'
                      : movement.sharing.phase === 'loading'
                        ? 'Loading sharing...'
                        : `Shared with ${sharingValue?.participantCount ?? 0} people`}
                  </span>
                </span>
                {sharingValue ? (
                  <small>Your share · {formatCurrencyAmount(sharingValue.personalExpenseAmount, movement.amount.currency)}</small>
                ) : null}
              </span>
              <span className="movement-detail-row-value">
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          {showItems ? (
            <button type="button" className="movement-detail-row" onClick={onOpenItemsSheet}>
              <span className="movement-detail-row-main movement-detail-row-main--stacked">
                <span className="movement-detail-row-leading">
                  <i className="bi bi-list-ul" aria-hidden />
                  <span>Items</span>
                </span>
                <small>{movement.items.length} items · {movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}</small>
              </span>
              <span className="movement-detail-row-value">
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          ) : null}
          <button type="button" className="movement-detail-row" onClick={onOpenMoreDetailsSheet}>
            <span className="movement-detail-row-main">
              <i className="bi bi-card-list" aria-hidden />
              <span>More details</span>
            </span>
            <span className="movement-detail-row-value">
              <i className="bi bi-chevron-right" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
