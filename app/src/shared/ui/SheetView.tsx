import type { ReactNode } from 'react';
import type { ViewProps } from './ViewProps';
import styles from './SheetView.module.css';
import { useSheetDragToClose } from './useSheetDragToClose';

export type SheetViewProps = ViewProps<
  {
    ariaLabel: string;
    title?: string;
    closeLabel?: string;
    backdropClassName?: string;
    panelClassName?: string;
    contentClassName?: string;
    contentAriaLabel?: string;
    closeOnBackdrop?: boolean;
    showHandle?: boolean;
    dragToClose?: boolean;
    dragUpToExpand?: boolean;
    dragDownToCollapse?: boolean;
    dragSurface?: 'handle' | 'panel';
  },
  {
    header?: ReactNode;
    body: ReactNode;
    footer?: ReactNode;
  },
  {
    open: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    close: () => void;
    expand?: () => void;
    collapse?: () => void;
  }
>;

export function SheetView({ required, provided }: SheetViewProps) {
  const { config, data, state } = required;
  const closeOnBackdrop = config.closeOnBackdrop ?? true;
  const drag = useSheetDragToClose(
    Boolean(config.dragToClose || config.dragUpToExpand || config.dragDownToCollapse),
    provided.commands.close,
    config.dragUpToExpand ? provided.commands.expand : undefined,
    config.dragDownToCollapse ? provided.commands.collapse : undefined,
  );

  if (!state.open) {
    return null;
  }

  function closeFromBackdrop() {
    if (!closeOnBackdrop) {
      return;
    }
    provided.commands.close();
  }

  const panelClassName = config.panelClassName
    ? `${styles.panel} ${config.panelClassName}${drag.dragging ? ` ${styles.dragging}` : ''}`
    : `${styles.panel}${drag.dragging ? ` ${styles.dragging}` : ''}`;
  const backdropClassName = config.backdropClassName
    ? `${styles.backdrop} ${config.backdropClassName}`
    : styles.backdrop;
  const closeLabel = config.closeLabel ?? 'Close';
  const panelStyle = (config.dragToClose || config.dragUpToExpand || config.dragDownToCollapse) && drag.offset !== 0
    ? { transform: `translateY(${drag.offset}px)` }
    : undefined;
  const handleHeaderClassName = config.showHandle && !config.title && !config.closeLabel
    ? `${styles.handleHeader} inline-header`
    : 'inline-header';
  const panelDragHandlers = config.dragSurface === 'panel' ? drag.handlers : {};
  const handleDragHandlers = config.dragSurface === 'panel' ? {} : drag.handlers;

  return (
    <div
      className={backdropClassName}
      role="presentation"
      data-testid="sheet-backdrop"
      onClick={closeFromBackdrop}
    >
      <section
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={config.ariaLabel}
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
        {...panelDragHandlers}
      >
        {data.header ?? (
          config.title || config.closeLabel || config.showHandle ? (
            <div
              className={handleHeaderClassName}
              {...handleDragHandlers}
            >
              {config.showHandle ? (
                <span
                  className={styles.handle}
                  aria-hidden
                  data-testid={config.dragToClose || config.dragUpToExpand || config.dragDownToCollapse ? 'sheet-drag-handle' : undefined}
                />
              ) : null}
              {config.title ? <h3>{config.title}</h3> : null}
              {config.closeLabel ? (
                <button
                  type="button"
                  className="text-button icon-button"
                  aria-label={closeLabel}
                  onClick={provided.commands.close}
                >
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null
        )}
        {config.contentClassName ? (
          <div className={config.contentClassName} aria-label={config.contentAriaLabel}>
            {data.body}
          </div>
        ) : data.body}
        {data.footer}
      </section>
    </div>
  );
}
