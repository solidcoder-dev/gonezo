import type { ViewProps } from '../../../shared/ui/ViewProps';
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
      <label className="movement-more-card" htmlFor={switchId}>
        <span className="movement-more-icon">
          <i className="bi bi-eye-slash" aria-hidden />
        </span>
        <span className="movement-more-card-text">
          <strong>Ignore movement</strong>
          <small>Exclude this expense or income from normal tracking</small>
        </span>
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          checked={required.state.ignored}
          disabled={required.status.disabled}
          onChange={(event) => provided.commands.setIgnored(event.currentTarget.checked)}
        />
      </label>

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
