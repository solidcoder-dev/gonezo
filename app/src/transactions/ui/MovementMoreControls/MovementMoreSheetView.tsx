import type { ViewProps } from '../../../shared/ui/ViewProps';
import { BinarySwitchCardView } from '../../../shared/ui/BinarySwitchCard/BinarySwitchCardView';
import './MovementMoreControlsView.css';

export type MovementMoreSheetViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    ignored: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    setIgnored: (value: boolean) => void;
    done: () => void;
  }
>;

export function MovementMoreSheetView({ required, provided }: MovementMoreSheetViewProps) {
  const switchId = 'composer-ignore-movement';

  return (
    <div className="movement-more-sheet">
      <BinarySwitchCardView
        required={{
          config: {
            switchId,
            title: 'Ignore movement',
            description: 'Exclude this expense or income from normal tracking',
            iconClassName: 'bi bi-eye-slash',
            ariaLabel: 'Ignore movement',
          },
          data: {},
          state: { value: required.state.ignored },
          status: { disabled: required.status.disabled },
        }}
        provided={{ commands: { setValue: provided.commands.setIgnored } }}
      />

      <button
        type="button"
        className="movement-more-done primary-button"
        disabled={required.status.disabled}
        onClick={provided.commands.done}
      >
        Done
      </button>
    </div>
  );
}
