import { SheetView } from '../../../shared/ui/SheetView';
import { SafeAreaScreenView } from '../../../shared/ui/SafeAreaScreenView';
import type { MovementDetailOverflowAction, MovementDetailSheet, MovementDetailTagView, MovementDetailViewModel } from '../../application/movementDetailView.types';
import { buildMovementDetailSheetContent } from './MovementDetailSheetContentView';
import { MovementDetailSummaryBodyView, MovementDetailSummaryHeaderView } from './MovementDetailSummaryView';
import './MovementDetailView.css';

export type MovementDetailViewProps = {
  required: {
    state: {
      open: boolean;
      activeSheet: MovementDetailSheet | null;
      overflowOpen: boolean;
      categoryQuery: string;
      tagsQuery: string;
    };
    data: {
      movement: MovementDetailViewModel | null;
      categories: Array<{ id: string; name: string }>;
      draftTags: MovementDetailTagView[];
      suggestedTags: Array<{ id: string; name: string }>;
      overflowActions?: MovementDetailOverflowAction[];
    };
    status: {
      savingCategory: boolean;
      savingTags: boolean;
      tagsDirty: boolean;
      togglingIgnored: boolean;
      deactivating: boolean;
      pendingVoid: boolean;
    };
  };
  provided: {
    commands: {
      closeDetail: () => void;
      dismissSheet: () => void;
      toggleOverflow: () => void;
      openCategorySheet: () => void;
      openTagsSheet: () => void;
      openSharingSheet: () => void;
      openItemsSheet: () => void;
      openMoreDetailsSheet: () => void;
      setCategoryQuery: (value: string) => void;
      setTagsQuery: (value: string) => void;
      saveCategory: (categoryId?: string) => void;
      toggleDraftTag: (tag: MovementDetailTagView) => void;
      saveTags: () => void;
      setIgnored: (value: boolean) => void;
      runOverflowAction: (actionId: MovementDetailOverflowAction['id']) => void;
      stopFutureMovements: (recurringMovementId: string) => void;
      postExpectedMovement: () => void;
    };
  };
};

function dismissBlocked(props: MovementDetailViewProps): boolean {
  const { activeSheet } = props.required.state;

  if (activeSheet === 'category') {
    return props.required.status.savingCategory;
  }
  if (activeSheet === 'tags') {
    return props.required.status.savingTags;
  }
  return false;
}

function sheetAriaLabel(activeSheet: MovementDetailSheet | null): string {
  if (activeSheet === 'items') {
    return 'Movement items';
  }
  if (activeSheet === 'more') {
    return 'Movement more';
  }
  if (activeSheet === 'category') {
    return 'Movement category';
  }
  if (activeSheet === 'tags') {
    return 'Movement tags';
  }
  if (activeSheet === 'sharing') {
    return 'Movement sharing';
  }
  return 'Movement detail sheet';
}

export function MovementDetailView(props: MovementDetailViewProps) {
  const { movement } = props.required.data;
  const { activeSheet, open } = props.required.state;

  if (!open || !movement) {
    return null;
  }

  const expectedFooter = movement.source === 'expected' && movement.canPostExpected ? (
    <div className="movement-detail-footer-content">
      <button
        type="button"
        className="primary-button movement-detail-primary"
        onClick={props.provided.commands.postExpectedMovement}
      >
        Post movement
      </button>
    </div>
  ) : undefined;

  const sheetDismissBlocked = dismissBlocked(props);
  const sheetContent = activeSheet ? buildMovementDetailSheetContent({
    movement,
    activeSheet,
    categoryQuery: props.required.state.categoryQuery,
    tagsQuery: props.required.state.tagsQuery,
    categories: props.required.data.categories,
    draftTags: props.required.data.draftTags,
    suggestedTags: props.required.data.suggestedTags,
    savingCategory: props.required.status.savingCategory,
    savingTags: props.required.status.savingTags,
    tagsDirty: props.required.status.tagsDirty,
    togglingIgnored: props.required.status.togglingIgnored,
    onSetCategoryQuery: props.provided.commands.setCategoryQuery,
    onSetTagsQuery: props.provided.commands.setTagsQuery,
    onSaveCategory: props.provided.commands.saveCategory,
    onToggleDraftTag: props.provided.commands.toggleDraftTag,
    onSaveTags: props.provided.commands.saveTags,
    onSetIgnored: props.provided.commands.setIgnored,
  }) : null;
  const summaryProps = {
    movement,
    overflowActions: props.required.data.overflowActions ?? [],
    overflowOpen: props.required.state.overflowOpen,
    pendingVoid: props.required.status.pendingVoid,
    deactivating: props.required.status.deactivating,
    onGoBack: activeSheet ? props.provided.commands.dismissSheet : props.provided.commands.closeDetail,
    onToggleOverflow: props.provided.commands.toggleOverflow,
    onRunOverflowAction: props.provided.commands.runOverflowAction,
    onOpenCategorySheet: props.provided.commands.openCategorySheet,
    onOpenTagsSheet: props.provided.commands.openTagsSheet,
    onOpenSharingSheet: props.provided.commands.openSharingSheet,
    onOpenItemsSheet: props.provided.commands.openItemsSheet,
    onOpenMoreDetailsSheet: props.provided.commands.openMoreDetailsSheet,
  };

  return (
    <>
      <SafeAreaScreenView
        required={{
          config: {
            ariaLabel: 'Movement detail',
            rootClassName: 'movement-detail-screen',
            footerClassName: expectedFooter ? 'movement-detail-footer' : undefined,
          },
          data: {
            header: <MovementDetailSummaryHeaderView {...summaryProps} />,
            body: <MovementDetailSummaryBodyView {...summaryProps} />,
            footer: expectedFooter,
          },
          state: { open },
          status: {},
        }}
        provided={{ commands: {} }}
      />

      <SheetView
        required={{
          config: {
            ariaLabel: sheetAriaLabel(activeSheet),
            title: activeSheet === 'category'
              ? 'Category'
              : activeSheet === 'tags'
                ? 'Tags'
                : activeSheet === 'sharing'
                  ? 'Sharing'
                  : activeSheet === 'items'
                    ? 'Items'
                    : activeSheet === 'more'
                      ? 'More details'
                      : undefined,
            showHandle: true,
            closeOnBackdrop: !sheetDismissBlocked,
            dragToClose: !sheetDismissBlocked,
            contentClassName: 'movement-detail-sheet-content',
            panelClassName: 'movement-detail-sheet-panel',
          },
          data: {
            body: sheetContent?.body ?? null,
            footer: sheetContent?.footer,
          },
          state: {
            open: activeSheet != null,
          },
          status: {
            disabled: sheetDismissBlocked,
          },
        }}
        provided={{
          commands: {
            close: props.provided.commands.dismissSheet,
          },
        }}
      />
    </>
  );
}
