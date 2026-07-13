import { useState } from 'react';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import { MovementDetailView } from '../MovementDetail/MovementDetailView';

type MovementDetailsSheetPreviewProps = {
  movement: MovementDetailViewModel | null;
  overflowActionLabel?: string;
  pendingVoid?: boolean;
  deactivating?: boolean;
  onClose: () => void;
  onRunOverflowAction?: () => void;
  onPostExpectedMovement?: () => void;
};

export function MovementDetailsSheetPreview(props: MovementDetailsSheetPreviewProps) {
  if (!props.movement) {
    return null;
  }

  return (
    <MovementDetailsSheetPreviewInner
      key={`${props.movement.source}:${props.movement.id}`}
      {...props}
      movement={props.movement}
    />
  );
}

function MovementDetailsSheetPreviewInner(props: MovementDetailsSheetPreviewProps & { movement: MovementDetailViewModel }) {
  const [activeSheet, setActiveSheet] = useState<'tags' | 'sharing' | 'items' | 'more' | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  function closeDetail() {
    setActiveSheet(null);
    setOverflowOpen(false);
    props.onClose();
  }

  return (
    <MovementDetailView
      required={{
        state: {
          open: true,
          activeSheet,
          overflowOpen,
          categoryQuery: '',
          tagsQuery: '',
        },
        data: {
          movement: props.movement,
          categories: [],
          draftTags: [],
          suggestedTags: [],
          overflowActionLabel: props.overflowActionLabel,
        },
        status: {
          savingCategory: false,
          savingTags: false,
          tagsDirty: activeSheet === 'tags',
          togglingIgnored: false,
          deactivating: props.deactivating === true,
          pendingVoid: props.pendingVoid === true,
        },
      }}
      provided={{
        commands: {
          closeDetail,
          dismissSheet: () => setActiveSheet(null),
          toggleOverflow: () => setOverflowOpen((previous) => !previous),
          openCategorySheet: () => undefined,
          openTagsSheet: () => setActiveSheet('tags'),
          openSharingSheet: () => setActiveSheet('sharing'),
          openItemsSheet: () => setActiveSheet('items'),
          openMoreDetailsSheet: () => setActiveSheet('more'),
          setCategoryQuery: () => undefined,
          setTagsQuery: () => undefined,
          saveCategory: () => undefined,
          toggleDraftTag: () => undefined,
          saveTags: () => undefined,
          setIgnored: () => undefined,
          runOverflowAction: () => props.onRunOverflowAction?.(),
          deactivateScheduledMovement: () => undefined,
          postExpectedMovement: () => props.onPostExpectedMovement?.(),
        },
      }}
    />
  );
}
