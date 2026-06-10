import type { ReactNode } from 'react';
import type { ViewProps } from './ViewProps';
import styles from './SheetView.module.css';

export type SheetViewProps = ViewProps<
  {
    ariaLabel: string;
    title?: string;
    closeLabel?: string;
    panelClassName?: string;
    contentClassName?: string;
    contentAriaLabel?: string;
    closeOnBackdrop?: boolean;
    showHandle?: boolean;
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
  }
>;

export function SheetView({ required, provided }: SheetViewProps) {
  const { config, data, state } = required;
  const closeOnBackdrop = config.closeOnBackdrop ?? true;

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
    ? `${styles.panel} ${config.panelClassName}`
    : styles.panel;
  const closeLabel = config.closeLabel ?? 'Close';

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      data-testid="sheet-backdrop"
      onClick={closeFromBackdrop}
    >
      <section
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={config.ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        {data.header ?? (
          config.title || config.closeLabel || config.showHandle ? (
            <div className="inline-header">
              {config.showHandle ? <span className={styles.handle} aria-hidden /> : null}
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
