import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { HomeMovementRowView } from '../../../shared/ui/HomeMovementList/HomeMovementListView';

export type ExpectedMovementCardItemView = {
  id: string;
} & HomeMovementRowView;

export type ExpectedMovementsCardViewProps = ViewProps<
  Record<string, never>,
  {
    movements: ExpectedMovementCardItemView[];
  },
  Record<string, never>,
  {
    loading: boolean;
    disabled?: boolean;
  },
  {
    selectMovement: (movementId: string) => void;
  }
>;
