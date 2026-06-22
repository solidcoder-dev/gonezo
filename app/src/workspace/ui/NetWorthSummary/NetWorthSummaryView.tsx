import type { ViewProps } from '../../../shared/ui/ViewProps';
import { SheetView } from '../../../shared/ui/SheetView';
import styles from './NetWorthSummaryView.module.css';

export type NetWorthCurrencyView = {
  currency: string;
  balanceAmount: string;
  formattedBalance: string;
  trend?: {
    points: Array<{ value: number }>;
    ariaLabel: string;
  };
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
  const [primaryItem, ...secondaryItems] = visibleItems;

  return (
    <>
      <section className={styles.card} aria-busy={status.loadPhase === 'loading'}>
        <div className={styles.header}>
          <h2>Total net worth</h2>
        </div>

        {status.loadPhase === 'failed' ? (
          <p className={styles.hint} role="alert">{status.error ?? 'Unable to load net worth.'}</p>
        ) : primaryItem ? (
          <div className={styles.summaryBody}>
            <div className={styles.primaryCurrency}>
              <span className={styles.currencyCode}>{primaryItem.currency}</span>
              <strong>{primaryItem.formattedBalance}</strong>
              {primaryItem.trend ? (
                <div className={styles.trend} aria-label={primaryItem.trend.ariaLabel}>
                  <NetWorthTrendLine points={primaryItem.trend.points} />
                </div>
              ) : null}
            </div>

            {secondaryItems.length > 0 ? (
              <div className={styles.secondaryList} aria-label="Additional net worth currencies">
                {secondaryItems.map((item) => (
                  <div className={styles.secondaryCurrency} key={item.currency}>
                    <div className={styles.secondaryCurrencyText}>
                      <span className={styles.currencyCode}>{item.currency}</span>
                      <strong>{item.formattedBalance}</strong>
                    </div>
                    {item.trend ? (
                      <div className={styles.secondaryTrend} aria-label={item.trend.ariaLabel}>
                        <NetWorthTrendLine points={item.trend.points} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
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

function NetWorthTrendLine({ points }: { points: Array<{ value: number }> }) {
  if (points.length < 2) {
    return null;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 48 - ((point.value - min) / range) * 40;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  const area = `${path} L 100 56 L 0 56 Z`;

  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={styles.trendArea} d={area} />
      <path className={styles.trendLine} d={path} />
      <circle className={styles.trendDot} cx="100" cy={path.split(' ').at(-1)} r="3.6" />
    </svg>
  );
}
