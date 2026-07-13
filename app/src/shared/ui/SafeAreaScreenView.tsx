import type { ReactNode } from 'react';
import type { ViewProps } from './ViewProps';
import styles from './SafeAreaScreenView.module.css';

export type SafeAreaScreenViewProps = ViewProps<
  {
    ariaLabel: string;
    rootClassName?: string;
    headerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
  },
  {
    header: ReactNode;
    body: ReactNode;
    footer?: ReactNode;
  },
  {
    open: boolean;
  }
>;

function className(baseClassName: string, extraClassName?: string): string {
  return extraClassName ? `${baseClassName} ${extraClassName}` : baseClassName;
}

export function SafeAreaScreenView({ required }: SafeAreaScreenViewProps) {
  const { config, data, state } = required;

  if (!state.open) {
    return null;
  }

  return (
    <section
      className={className(styles.root, config.rootClassName)}
      role="dialog"
      aria-modal="true"
      aria-label={config.ariaLabel}
    >
      <header className={className(styles.header, config.headerClassName)}>
        {data.header}
      </header>
      <div className={className(styles.body, config.contentClassName)}>
        {data.body}
      </div>
      {data.footer ? (
        <footer className={className(styles.footer, config.footerClassName)}>
          {data.footer}
        </footer>
      ) : null}
    </section>
  );
}
