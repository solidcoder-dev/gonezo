import type { ViewProps } from '../../../shared/ui/ViewProps';
import { SheetView } from '../../../shared/ui/SheetView';
import styles from './NetWorthSummaryView.module.css';

export type NetWorthCurrencyView = {
  currency: string;
  balanceAmount: string;
  formattedBalance: string;
};

export type NetWorthSummaryViewProps = ViewProps<
  {
    visibleLimit: number;
  },
  {
    items: NetWorthCurrencyView[];
  },
  {
    allCurrenciesOpen: boolean;
  },
  {
    loadPhase: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
  },
  {
    openAll: () => void;
    closeAll: () => void;
  }
>;

export function NetWorthSummaryView({ required, provided }: NetWorthSummaryViewProps) {
  const { config, data, state, status } = required;
  const visibleItems = data.items.slice(0, config.visibleLimit);
  const hasOverflow = data.items.length > visibleItems.length;
  const hiddenItemsCount = data.items.length - visibleItems.length;

  return (
    <>
      <section className={styles.card} aria-busy={status.loadPhase === 'loading'}>
        <div className={styles.header}>
          <h2>Total net worth</h2>
        </div>

        {status.loadPhase === 'failed' ? (
          <p className={styles.hint} role="alert">{status.error ?? 'Unable to load net worth.'}</p>
        ) : visibleItems.length > 0 ? (
          <div className={styles.currencyList}>
            {visibleItems.map((item) => (
              <div className={styles.currencyColumn} key={item.currency}>
                <span className={styles.currencyCode}>{item.currency}</span>
                <strong>{item.formattedBalance}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.hint}>
            {status.loadPhase === 'loading' ? 'Loading balances...' : 'No balances yet'}
          </p>
        )}

        {hasOverflow ? (
          <div className={styles.footer}>
            <span>+{hiddenItemsCount} {hiddenItemsCount === 1 ? 'currency' : 'currencies'}</span>
            <button
              type="button"
              className={styles.viewAllButton}
              aria-label="View all net worth currencies"
              onClick={provided.commands.openAll}
            >
              View all
            </button>
          </div>
        ) : null}
      </section>

      <SheetView
        required={{
          config: {
            ariaLabel: 'All net worth currencies',
            title: 'Total net worth',
            closeLabel: 'Close net worth currencies',
            panelClassName: styles.sheetPanel,
            contentClassName: styles.sheetContent,
          },
          data: {
            body: (
              <div className={styles.sheetList}>
                {data.items.map((item) => (
                  <div className={styles.sheetRow} key={item.currency}>
                    <span>{item.currency}</span>
                    <strong>{item.formattedBalance}</strong>
                  </div>
                ))}
              </div>
            ),
          },
          state: { open: state.allCurrenciesOpen },
          status: {},
        }}
        provided={{
          commands: {
            close: provided.commands.closeAll,
          },
        }}
      />
    </>
  );
}
