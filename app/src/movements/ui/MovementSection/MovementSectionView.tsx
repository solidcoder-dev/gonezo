import type { ReactNode } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import './MovementSectionView.css';

export type MovementSectionViewProps = ViewProps<
  {
    ariaLabel: string;
    title: string;
    toggleLabel?: string;
  },
  {
    count: number;
    body: ReactNode;
  },
  {
    collapsible: boolean;
    expanded: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    toggle?: () => void;
  }
>;

export function MovementSectionView({ required, provided }: MovementSectionViewProps) {
  const { config, data, state, status } = required;
  const hasItems = data.count > 0;
  const renderBody = !state.collapsible || state.expanded;

  return (
    <div className="stack" aria-label={config.ariaLabel}>
      {state.collapsible && hasItems ? (
        <button
          type="button"
          className="movement-section-trigger"
          aria-label={`${state.expanded ? 'Collapse' : 'Expand'} ${config.toggleLabel ?? config.title.toLowerCase()} (${data.count})`}
          aria-expanded={state.expanded}
          onClick={provided.commands.toggle}
          disabled={status.disabled}
        >
          <span>{config.title}</span>
          <span className="movement-section-count">
            {data.count}
          </span>
          <i className={state.expanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'} aria-hidden />
        </button>
      ) : (
        <div className="inline-header">
          <h3>{config.title}</h3>
          <span className="hint">{data.count}</span>
        </div>
      )}
      {renderBody ? data.body : null}
    </div>
  );
}
