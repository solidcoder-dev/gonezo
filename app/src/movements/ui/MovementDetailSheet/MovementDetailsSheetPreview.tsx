import { useState } from 'react';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import { MovementDetailsSheetView } from './MovementDetailsSheetView';

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
  const [screen, setScreen] = useState<'summary' | 'tags' | 'sharing' | 'items' | 'more'>('summary');
  const [overflowOpen, setOverflowOpen] = useState(false);

  function close() {
    setScreen('summary');
    setOverflowOpen(false);
    props.onClose();
  }

  return (
    <MovementDetailsSheetView
      required={{
        state: {
          open: true,
          screen,
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
          tagsDirty: screen === 'tags',
          togglingIgnored: false,
          deactivating: props.deactivating === true,
          pendingVoid: props.pendingVoid === true,
        },
      }}
      provided={{
        commands: {
          close,
          dismissSubview: () => setScreen('summary'),
          toggleOverflow: () => setOverflowOpen((previous) => !previous),
          openCategoryScreen: () => undefined,
          openTagsScreen: () => setScreen('tags'),
          openSharingScreen: () => setScreen('sharing'),
          openItemsScreen: () => setScreen('items'),
          openMoreScreen: () => setScreen('more'),
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
