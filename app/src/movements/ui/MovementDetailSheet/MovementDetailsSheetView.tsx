import type { ReactNode } from 'react';
import { BinarySwitchCardView } from '../../../shared/ui/BinarySwitchCard/BinarySwitchCardView';
import { SheetView } from '../../../shared/ui/SheetView';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import {
  movementDetailAmountLabel,
  movementDetailIconClassName,
  movementDetailRowAmount,
  movementDetailTypeLabel,
} from '../../application/movementDetailMappers';
import type { MovementDetailTagView, MovementDetailViewModel } from '../../application/movementDetailView.types';
import './MovementDetailsSheetView.css';

export type MovementDetailsSheetViewProps = {
  required: {
    state: {
      open: boolean;
      screen: 'summary' | 'category' | 'tags' | 'sharing' | 'items' | 'more';
      overflowOpen: boolean;
      categoryQuery: string;
      tagsQuery: string;
    };
    data: {
      movement: MovementDetailViewModel | null;
      categories: Array<{ id: string; name: string }>;
      draftTags: MovementDetailTagView[];
      suggestedTags: Array<{ id: string; name: string }>;
      overflowActionLabel?: string;
    };
    status: {
      savingCategory: boolean;
      savingTags: boolean;
      togglingIgnored: boolean;
      deactivating: boolean;
      pendingVoid: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      back: () => void;
      toggleOverflow: () => void;
      openCategoryScreen: () => void;
      openTagsScreen: () => void;
      openSharingScreen: () => void;
      openItemsScreen: () => void;
      openMoreScreen: () => void;
      setCategoryQuery: (value: string) => void;
      setTagsQuery: (value: string) => void;
      saveCategory: (categoryId?: string) => void;
      toggleDraftTag: (tag: MovementDetailTagView) => void;
      saveTags: () => void;
      setIgnored: (value: boolean) => void;
      runOverflowAction: () => void;
      deactivateScheduledMovement: () => void;
      postExpectedMovement: () => void;
    };
  };
};

function statusLabel(movement: MovementDetailViewModel): string {
  if (movement.source === 'posted') {
    return movement.status === 'voided' ? 'Voided' : 'Posted';
  }
  if (movement.source === 'scheduled') {
    if (movement.status === 'deactivated') {
      return 'Deactivated';
    }
    if (movement.status === 'completed') {
      return 'Completed';
    }
    return 'Active';
  }
  if (movement.status === 'resolved') {
    return 'Resolved';
  }
  if (movement.status === 'dismissed') {
    return 'Dismissed';
  }
  return 'Pending';
}

function summaryTags(tags: MovementDetailTagView[]): ReactNode {
  if (tags.length === 0) {
    return <span className="movement-details-placeholder">No tags</span>;
  }
  return (
    <span className="movement-details-chip-list">
      {tags.map((tag) => (
        <span key={tag.id ?? tag.name} className="movement-details-chip">
          {tag.name}
        </span>
      ))}
    </span>
  );
}

function subHeader(
  title: string,
  props: MovementDetailsSheetViewProps,
  action?: React.ReactNode,
) {
  return (
    <div className="movement-details-header">
      <button type="button" className="text-button icon-button" aria-label={`Back to movement ${title.toLowerCase()}`} onClick={props.provided.commands.back}>
        <i className="bi bi-arrow-left" aria-hidden />
      </button>
      <h3>{title}</h3>
      <div className="movement-details-header-side">{action}</div>
    </div>
  );
}

function overflowMenu(props: MovementDetailsSheetViewProps) {
  if (!props.required.data.overflowActionLabel || !props.required.state.overflowOpen) {
    return null;
  }
  const label = props.required.status.pendingVoid
    ? 'Pending...'
    : props.required.status.deactivating
      ? 'Deactivating...'
      : props.required.data.overflowActionLabel;
  return (
    <div className="movement-details-overflow" role="menu" aria-label="Movement actions">
      <button
        type="button"
        className="movement-details-overflow-action"
        role="menuitem"
        onClick={props.provided.commands.runOverflowAction}
        disabled={props.required.status.pendingVoid || props.required.status.deactivating}
      >
        {label}
      </button>
    </div>
  );
}

function summaryBody(props: MovementDetailsSheetViewProps, movement: MovementDetailViewModel) {
  const iconClassName = movementDetailIconClassName(movement.financialType);
  const showCategory = movement.financialType !== 'transfer' && (movement.canEditCategory || movement.category != null);
  const showTags = movement.source !== 'expected' && (movement.canEditTags || movement.tags.length > 0);
  const showSharing = movement.source === 'posted'
    && movement.financialType === 'expense'
    && (
      movement.sharing.phase === 'loading'
      || movement.sharing.phase === 'error'
      || (movement.sharing.phase === 'loaded' && movement.sharing.value != null)
    );
  const showItems = movement.items.length > 0;
  const showFooter = movement.source === 'expected' && movement.canPostExpected;
  const sharingValue = movement.source === 'posted' && movement.sharing.phase === 'loaded'
    ? movement.sharing.value
    : null;

  return {
    body: (
      <div className="movement-details-sheet">
        <div className="movement-details-header">
          <button type="button" className="text-button icon-button" aria-label="Close movement details" onClick={props.provided.commands.close}>
            <i className="bi bi-x-lg" aria-hidden />
          </button>
          <h3>Movement</h3>
          <div className="movement-details-header-side">
            {props.required.data.overflowActionLabel ? (
              <button type="button" className="text-button icon-button" aria-label="Movement actions" aria-haspopup="menu" aria-expanded={props.required.state.overflowOpen} onClick={props.provided.commands.toggleOverflow}>
                <i className="bi bi-three-dots" aria-hidden />
              </button>
            ) : null}
          </div>
          {overflowMenu(props)}
        </div>

        <section className={`movement-details-hero movement-details-hero--${movement.financialType}`}>
          <div className="movement-details-hero-top">
            <span className="movement-details-hero-icon">
              <i className={iconClassName} aria-hidden />
            </span>
            <div className="movement-details-hero-copy">
              <strong>{movement.title}</strong>
              <span>{[movement.accountLabel, movement.dateLabel].filter(Boolean).join(' · ')}</span>
            </div>
          </div>
          <div className="movement-details-hero-bottom">
            <strong className="movement-details-hero-amount">
              {movement.amount.sign}
              {movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}
            </strong>
            <div className="movement-details-chip-list">
              <span className={`movement-details-chip movement-details-chip--tone-${movement.financialType}`}>
                {movementDetailTypeLabel(movement.financialType)}
              </span>
              {'lifecycleChip' in movement && movement.lifecycleChip ? (
                <span className="movement-details-chip movement-details-chip--secondary">{movement.lifecycleChip}</span>
              ) : null}
            </div>
          </div>
        </section>

        <div className="movement-details-section">
          <span className="movement-details-section-title">Classification</span>
          <div className="movement-details-group">
            {showCategory && movement.canEditCategory ? (
              <button type="button" className="movement-details-row" onClick={props.provided.commands.openCategoryScreen}>
                <span className="movement-details-row-main">
                  <i className="bi bi-bookmark" aria-hidden />
                  <span>Category</span>
                </span>
                <span className="movement-details-row-value">
                  <span className={movement.category ? 'movement-details-chip movement-details-chip--filled' : 'movement-details-placeholder'}>
                    {movement.category?.name ?? 'No category'}
                  </span>
                  <i className="bi bi-chevron-right" aria-hidden />
                </span>
              </button>
            ) : null}
            {showCategory && !movement.canEditCategory ? (
              <div className="movement-details-row movement-details-row--static">
                <span className="movement-details-row-main">
                  <i className="bi bi-bookmark" aria-hidden />
                  <span>Category</span>
                </span>
                <span className="movement-details-row-value">
                  <span className={movement.category ? 'movement-details-chip movement-details-chip--filled' : 'movement-details-placeholder'}>
                    {movement.category?.name ?? 'No category'}
                  </span>
                </span>
              </div>
            ) : null}
            {showTags && movement.canEditTags ? (
              <button type="button" className="movement-details-row" onClick={props.provided.commands.openTagsScreen}>
                <span className="movement-details-row-main">
                  <i className="bi bi-tags" aria-hidden />
                  <span>Tags</span>
                </span>
                <span className="movement-details-row-value movement-details-row-value--tags">
                  {summaryTags(movement.tags)}
                  <i className="bi bi-chevron-right" aria-hidden />
                </span>
              </button>
            ) : null}
            {showTags && !movement.canEditTags ? (
              <div className="movement-details-row movement-details-row--static">
                <span className="movement-details-row-main">
                  <i className="bi bi-tags" aria-hidden />
                  <span>Tags</span>
                </span>
                <span className="movement-details-row-value movement-details-row-value--tags">
                  {summaryTags(movement.tags)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="movement-details-section">
          <span className="movement-details-section-title">Movement</span>
          <div className="movement-details-group">
            {showSharing ? (
              <button type="button" className="movement-details-row" onClick={props.provided.commands.openSharingScreen}>
                <span className="movement-details-row-main movement-details-row-main--stacked">
                  <span className="movement-details-row-leading">
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
                <span className="movement-details-row-value">
                  <i className="bi bi-chevron-right" aria-hidden />
                </span>
              </button>
            ) : null}
            {showItems ? (
              <button type="button" className="movement-details-row" onClick={props.provided.commands.openItemsScreen}>
                <span className="movement-details-row-main movement-details-row-main--stacked">
                  <span className="movement-details-row-leading">
                    <i className="bi bi-list-ul" aria-hidden />
                    <span>Items</span>
                  </span>
                  <small>{movement.items.length} items · {movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}</small>
                </span>
                <span className="movement-details-row-value">
                  <i className="bi bi-chevron-right" aria-hidden />
                </span>
              </button>
            ) : null}
            <button type="button" className="movement-details-row" onClick={props.provided.commands.openMoreScreen}>
              <span className="movement-details-row-main">
                <i className="bi bi-card-list" aria-hidden />
                <span>More details</span>
              </span>
              <span className="movement-details-row-value">
                <i className="bi bi-chevron-right" aria-hidden />
              </span>
            </button>
          </div>
        </div>
      </div>
    ),
    footer: showFooter ? (
      <div className="movement-details-footer">
        <button type="button" className="primary-button movement-details-primary" onClick={props.provided.commands.postExpectedMovement}>
          Post movement
        </button>
      </div>
    ) : undefined,
  };
}

function categoryBody(props: MovementDetailsSheetViewProps, movement: MovementDetailViewModel) {
  return (
    <div className="movement-details-sheet movement-details-subview">
      {subHeader('Category', props)}
      <div className="movement-details-search">
        <i className="bi bi-search" aria-hidden />
        <input
          type="search"
          placeholder="Search categories"
          value={props.required.state.categoryQuery}
          onChange={(event) => props.provided.commands.setCategoryQuery(event.currentTarget.value)}
        />
      </div>
      <div className="movement-details-list">
        {props.required.data.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`movement-details-choice${movement.category?.id === category.id ? ' movement-details-choice--selected' : ''}`}
            onClick={() => props.provided.commands.saveCategory(category.id)}
            disabled={props.required.status.savingCategory}
          >
            <span>{category.name}</span>
            {movement.category?.id === category.id ? <i className="bi bi-check-lg" aria-hidden /> : null}
          </button>
        ))}
        <button
          type="button"
          className={`movement-details-choice${movement.category == null ? ' movement-details-choice--selected' : ''}`}
          onClick={() => props.provided.commands.saveCategory(undefined)}
          disabled={props.required.status.savingCategory}
        >
          <span>No category</span>
          {movement.category == null ? <i className="bi bi-check-lg" aria-hidden /> : null}
        </button>
      </div>
    </div>
  );
}

function tagsBody(props: MovementDetailsSheetViewProps) {
  return (
    <div className="movement-details-sheet movement-details-subview">
      {subHeader(
        'Tags',
        props,
        <button type="button" className="text-button movement-details-done" onClick={props.provided.commands.saveTags} disabled={props.required.status.savingTags}>
          Done
        </button>,
      )}
      <div className="movement-details-search">
        <i className="bi bi-search" aria-hidden />
        <input
          type="search"
          placeholder="Search tags"
          value={props.required.state.tagsQuery}
          onChange={(event) => props.provided.commands.setTagsQuery(event.currentTarget.value)}
        />
      </div>
      <div className="movement-details-tags-block">
        <span className="movement-details-section-title">Selected tags</span>
        <div className="movement-details-chip-list movement-details-chip-list--wrap">
          {props.required.data.draftTags.length === 0 ? <span className="movement-details-placeholder">No tags selected</span> : null}
          {props.required.data.draftTags.map((tag) => (
            <button key={tag.id ?? tag.name} type="button" className="movement-details-chip movement-details-chip--filled movement-details-chip-button" onClick={() => props.provided.commands.toggleDraftTag(tag)}>
              <span>{tag.name}</span>
              <i className="bi bi-x" aria-hidden />
            </button>
          ))}
        </div>
      </div>
      <div className="movement-details-list">
        <span className="movement-details-section-title">Suggested tags</span>
        {props.required.data.suggestedTags.map((tag) => (
          <button key={tag.id} type="button" className="movement-details-choice" onClick={() => props.provided.commands.toggleDraftTag(tag)}>
            <span>{tag.name}</span>
            <i className="bi bi-plus-lg" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

function sharingBody(props: MovementDetailsSheetViewProps, movement: Extract<MovementDetailViewModel, { source: 'posted' }>) {
  return (
    <div className="movement-details-sheet movement-details-subview">
      {subHeader('Sharing', props)}
      {movement.sharing.phase === 'loading' ? <p role="status">Loading sharing...</p> : null}
      {movement.sharing.phase === 'error' ? <p>Sharing unavailable</p> : null}
      {movement.sharing.phase === 'loaded' && movement.sharing.value ? (
        <>
          <div className="movement-details-summary-grid">
            <div>
              <small>Total amount</small>
              <strong>{formatCurrencyAmount(movement.sharing.value.totalAmount, movement.amount.currency)}</strong>
            </div>
            <div>
              <small>Your share</small>
              <strong>{formatCurrencyAmount(movement.sharing.value.personalExpenseAmount, movement.amount.currency)}</strong>
            </div>
          </div>
          <div className="movement-details-list">
            <span className="movement-details-section-title">Participants</span>
            {movement.sharing.value.participants.map((participant) => (
              <div key={participant.id} className="movement-details-choice movement-details-choice--static">
                <span className="movement-details-choice-stack">
                  <strong>{participant.name}</strong>
                  {participant.reimbursementStatus ? <small>{participant.reimbursementStatus === 'pending' ? 'Pending reimbursement' : participant.reimbursementStatus === 'paid' ? 'Paid' : 'Dismissed'}</small> : null}
                </span>
                <strong>{formatCurrencyAmount(participant.amount, movement.amount.currency)}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function itemsBody(props: MovementDetailsSheetViewProps, movement: MovementDetailViewModel) {
  return (
    <div className="movement-details-sheet movement-details-subview">
      {subHeader('Items', props)}
      <div className="movement-details-summary-card">
        <strong>{movement.items.length} items · {movementDetailAmountLabel(movement.amount.value, movement.amount.currency)}</strong>
      </div>
      <div className="movement-details-list">
        {movement.items.map((item) => (
          <div key={item.id} className="movement-details-choice movement-details-choice--static">
            <span>{item.name}</span>
            <strong>{movementDetailRowAmount(item.amount, item.currency)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function moreDetailsBody(props: MovementDetailsSheetViewProps, movement: MovementDetailViewModel) {
  return (
    <div className="movement-details-sheet movement-details-subview">
      {subHeader('More details', props)}
      <div className="movement-details-list">
        {movement.note ? <div className="movement-details-choice movement-details-choice--static"><span>Note</span><strong>{movement.note}</strong></div> : null}
        {movement.merchant ? <div className="movement-details-choice movement-details-choice--static"><span>Merchant</span><strong>{movement.merchant}</strong></div> : null}
        {movement.source === 'posted' || movement.source === 'expected' ? (
          <div className="movement-details-choice movement-details-choice--static"><span>Account</span><strong>{movement.accountLabel ?? '-'}</strong></div>
        ) : (
          <div className="movement-details-choice movement-details-choice--static"><span>Source account</span><strong>{movement.accountLabel ?? '-'}</strong></div>
        )}
        {movement.source === 'scheduled' && movement.financialType === 'transfer' ? (
          <div className="movement-details-choice movement-details-choice--static"><span>Target account</span><strong>{movement.targetAccountLabel ?? '-'}</strong></div>
        ) : null}
        {movement.source === 'posted' ? (
          <div className="movement-details-choice movement-details-choice--static"><span>Posted at</span><strong>{movement.postedAtLabel}</strong></div>
        ) : null}
        {movement.source === 'expected' ? (
          <>
            <div className="movement-details-choice movement-details-choice--static"><span>Expected at</span><strong>{movement.expectedAtLabel}</strong></div>
            <div className="movement-details-choice movement-details-choice--static"><span>Origin</span><strong>{movement.originLabel}</strong></div>
          </>
        ) : null}
        {movement.source === 'scheduled' ? (
          <>
            <div className="movement-details-choice movement-details-choice--static"><span>Next due</span><strong>{movement.nextDueLabel}</strong></div>
            <div className="movement-details-choice movement-details-choice--static"><span>Schedule</span><strong>{movement.scheduleSummary}</strong></div>
            <div className="movement-details-choice movement-details-choice--static"><span>Origin</span><strong>{movement.originLabel}</strong></div>
          </>
        ) : null}
        <div className="movement-details-choice movement-details-choice--static"><span>Status</span><strong>{statusLabel(movement)}</strong></div>
      </div>
      {'canToggleIgnored' in movement && movement.canToggleIgnored ? (
        <div className="movement-details-switch">
          <BinarySwitchCardView
            required={{
              config: {
                switchId: 'movement-detail-ignored',
                title: 'Ignore in analytics',
                description: 'Exclude from spending insights',
                iconClassName: 'bi bi-eye-slash',
                ariaLabel: 'Ignore in analytics',
              },
              data: {},
              state: { value: movement.ignored },
              status: { disabled: props.required.status.togglingIgnored },
            }}
            provided={{ commands: { setValue: props.provided.commands.setIgnored } }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function MovementDetailsSheetView(props: MovementDetailsSheetViewProps) {
  const movement = props.required.data.movement;
  if (!movement) {
    return null;
  }

  const content = props.required.state.screen === 'summary'
    ? summaryBody(props, movement)
    : props.required.state.screen === 'category'
      ? { body: categoryBody(props, movement) }
      : props.required.state.screen === 'tags'
        ? { body: tagsBody(props) }
        : props.required.state.screen === 'sharing' && movement.source === 'posted'
          ? { body: sharingBody(props, movement) }
          : props.required.state.screen === 'items'
            ? { body: itemsBody(props, movement) }
            : { body: moreDetailsBody(props, movement) };

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Movement detail',
          panelClassName: 'movement-details-panel',
          contentClassName: 'movement-details-content',
          closeOnBackdrop: true,
        },
        data: content,
        state: { open: props.required.state.open },
        status: { disabled: false },
      }}
      provided={{ commands: { close: props.provided.commands.close } }}
    />
  );
}
