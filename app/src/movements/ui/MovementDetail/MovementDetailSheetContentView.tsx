import type { ReactNode } from 'react';
import { BinarySwitchCardView } from '../../../shared/ui/BinarySwitchCard/BinarySwitchCardView';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import {
  movementDetailRowAmount,
} from '../../application/movementDetailMappers';
import type {
  MovementDetailSheet,
  MovementDetailTagView,
  MovementDetailViewModel,
} from '../../application/movementDetailView.types';

type MovementDetailSheetContentViewProps = {
  movement: MovementDetailViewModel;
  activeSheet: MovementDetailSheet;
  categoryQuery: string;
  tagsQuery: string;
  categories: Array<{ id: string; name: string }>;
  draftTags: MovementDetailTagView[];
  suggestedTags: Array<{ id: string; name: string }>;
  savingCategory: boolean;
  savingTags: boolean;
  tagsDirty: boolean;
  togglingIgnored: boolean;
  onSetCategoryQuery: (value: string) => void;
  onSetTagsQuery: (value: string) => void;
  onSaveCategory: (categoryId?: string) => void;
  onToggleDraftTag: (tag: MovementDetailTagView) => void;
  onSaveTags: () => void;
  onSetIgnored: (value: boolean) => void;
};

export type MovementDetailSheetContent = {
  title: string;
  body: ReactNode;
  footer?: ReactNode;
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

function detailRow(label: string, value: ReactNode, stackable = false) {
  return (
    <div className={`movement-detail-detail-row${stackable ? ' movement-detail-detail-row--stackable' : ''}`}>
      <span className="movement-detail-detail-label">{label}</span>
      <span className="movement-detail-detail-value">{value}</span>
    </div>
  );
}

function categoryContent(props: MovementDetailSheetContentViewProps): MovementDetailSheetContent {
  const { movement } = props;

  return {
    title: 'Category',
    body: (
      <>
        <div className="movement-detail-search">
          <i className="bi bi-search" aria-hidden />
          <input
            type="search"
            placeholder="Search categories"
            value={props.categoryQuery}
            onChange={(event) => props.onSetCategoryQuery(event.currentTarget.value)}
          />
        </div>
        <div className="movement-detail-list">
          {props.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`movement-detail-choice${movement.category?.id === category.id ? ' movement-detail-choice--selected' : ''}`}
              onClick={() => props.onSaveCategory(category.id)}
              disabled={props.savingCategory}
            >
              <span>{category.name}</span>
              {movement.category?.id === category.id ? <i className="bi bi-check-lg" aria-hidden /> : null}
            </button>
          ))}
          <button
            type="button"
            className={`movement-detail-choice${movement.category == null ? ' movement-detail-choice--selected' : ''}`}
            onClick={() => props.onSaveCategory(undefined)}
            disabled={props.savingCategory}
          >
            <span>No category</span>
            {movement.category == null ? <i className="bi bi-check-lg" aria-hidden /> : null}
          </button>
        </div>
      </>
    ),
  };
}

function tagsContent(props: MovementDetailSheetContentViewProps): MovementDetailSheetContent {
  return {
    title: 'Tags',
    body: (
      <>
        <div className="movement-detail-search">
          <i className="bi bi-search" aria-hidden />
          <input
            type="search"
            placeholder="Search tags"
            value={props.tagsQuery}
            onChange={(event) => props.onSetTagsQuery(event.currentTarget.value)}
          />
        </div>
        <div className="movement-detail-tags-block">
          <span className="movement-detail-section-title">Selected tags</span>
          <div className="movement-detail-chip-list movement-detail-chip-list--wrap">
            {props.draftTags.length === 0 ? <span className="movement-detail-placeholder">No tags selected</span> : null}
            {props.draftTags.map((tag) => (
              <button
                key={tag.id ?? tag.name}
                type="button"
                className="movement-detail-chip movement-detail-chip--filled movement-detail-chip-button"
                onClick={() => props.onToggleDraftTag(tag)}
              >
                <span>{tag.name}</span>
                <i className="bi bi-x" aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <div className="movement-detail-tags-block">
          <span className="movement-detail-section-title">Suggested tags</span>
          <div className="movement-detail-list">
            {props.suggestedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="movement-detail-choice"
                onClick={() => props.onToggleDraftTag(tag)}
              >
                <span>{tag.name}</span>
                <i className="bi bi-plus-lg" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </>
    ),
    footer: (
      <div className="movement-detail-footer-content">
        <button
          type="button"
          className="primary-button movement-detail-primary"
          onClick={props.onSaveTags}
          disabled={props.savingTags || !props.tagsDirty}
        >
          {props.savingTags ? 'Saving…' : 'Apply'}
        </button>
      </div>
    ),
  };
}

function sharingContent(movement: Extract<MovementDetailViewModel, { source: 'posted' }>): MovementDetailSheetContent {
  return {
    title: 'Sharing',
    body: (
      <>
        {movement.sharing.phase === 'loading' ? <p role="status">Loading sharing...</p> : null}
        {movement.sharing.phase === 'error' ? <p>Sharing unavailable</p> : null}
        {movement.sharing.phase === 'loaded' && movement.sharing.value ? (
          <>
            <div className="movement-detail-summary-grid">
              <div>
                <small>Total amount</small>
                <strong>{formatCurrencyAmount(movement.sharing.value.totalAmount, movement.amount.currency)}</strong>
              </div>
              <div>
                <small>Your share</small>
                <strong>{formatCurrencyAmount(movement.sharing.value.personalExpenseAmount, movement.amount.currency)}</strong>
              </div>
            </div>
            <div className="movement-detail-list">
              <span className="movement-detail-section-title">Participants</span>
              {movement.sharing.value.participants.map((participant) => (
                <div key={participant.id} className="movement-detail-choice movement-detail-choice--static">
                  <span className="movement-detail-choice-stack">
                    <strong>{participant.name}</strong>
                    {participant.reimbursementStatus ? (
                      <small>
                        {participant.reimbursementStatus === 'pending'
                          ? 'Pending reimbursement'
                          : participant.reimbursementStatus === 'paid'
                            ? 'Paid'
                            : 'Dismissed'}
                      </small>
                    ) : null}
                  </span>
                  <strong>{formatCurrencyAmount(participant.amount, movement.amount.currency)}</strong>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </>
    ),
  };
}

function itemsContent(movement: MovementDetailViewModel): MovementDetailSheetContent {
  return {
    title: 'Items',
    body: (
      <>
        <div className="movement-detail-summary-card">
          <strong>{movement.items.length} items · {formatCurrencyAmount(movement.amount.value, movement.amount.currency)}</strong>
        </div>
        <div className="movement-detail-list">
          {movement.items.map((item) => (
            <div key={item.id} className="movement-detail-choice movement-detail-choice--static">
              <span>{item.name}</span>
              <strong>{movementDetailRowAmount(item.amount, item.currency)}</strong>
            </div>
          ))}
        </div>
      </>
    ),
  };
}

function moreDetailsContent(props: MovementDetailSheetContentViewProps): MovementDetailSheetContent {
  const { movement } = props;

  return {
    title: 'More details',
    body: (
      <>
        <div className="movement-detail-list movement-detail-list--details">
          {movement.note ? detailRow('Note', movement.note, true) : null}
          {movement.merchant ? detailRow('Merchant', movement.merchant, true) : null}
          {movement.source === 'posted' || movement.source === 'expected'
            ? detailRow('Account', movement.accountLabel ?? '-')
            : detailRow('Source account', movement.accountLabel ?? '-')}
          {movement.source === 'scheduled' && movement.financialType === 'transfer'
            ? detailRow('Target account', movement.targetAccountLabel ?? '-')
            : null}
          {movement.source === 'posted' ? detailRow('Posted at', movement.postedAtLabel) : null}
          {movement.source === 'expected' ? (
            <>
              {detailRow('Expected at', movement.expectedAtLabel)}
              {detailRow('Origin', movement.originLabel)}
            </>
          ) : null}
          {movement.source === 'scheduled' ? (
            <>
              {detailRow('Next due', movement.nextDueLabel)}
              {detailRow('Schedule', movement.scheduleSummary, true)}
              {detailRow('Origin', movement.originLabel)}
            </>
          ) : null}
          {detailRow('Status', statusLabel(movement))}
        </div>
        {'canToggleIgnored' in movement && movement.canToggleIgnored ? (
          <div className="movement-detail-switch">
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
                state: {
                  value: movement.ignored,
                },
                status: {
                  disabled: props.togglingIgnored,
                },
              }}
              provided={{
                commands: {
                  setValue: props.onSetIgnored,
                },
              }}
            />
          </div>
        ) : null}
      </>
    ),
  };
}

export function buildMovementDetailSheetContent(props: MovementDetailSheetContentViewProps): MovementDetailSheetContent {
  let content: MovementDetailSheetContent;

  switch (props.activeSheet) {
    case 'category':
      content = categoryContent(props);
      break;
    case 'tags':
      content = tagsContent(props);
      break;
    case 'sharing':
      content = sharingContent(props.movement as Extract<MovementDetailViewModel, { source: 'posted' }>);
      break;
    case 'items':
      content = itemsContent(props.movement);
      break;
    case 'more':
      content = moreDetailsContent(props);
      break;
  }

  return content;
}
