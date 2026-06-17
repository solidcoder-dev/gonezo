import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { MovementRowDataView } from '../MovementRow/MovementRowView';

export type ExpectedMovementCardItemView = {
  id: string;
  row: MovementRowDataView;
};

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
