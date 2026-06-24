import type { ViewProps } from '../../../shared/ui/ViewProps';
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
  Record<string, never>,
  {
    items: NetWorthCurrencyView[];
  },
  Record<string, never>,
  {
    loadPhase: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
  },
  Record<string, never>
>;

export function NetWorthSummaryView({ required }: NetWorthSummaryViewProps) {
  const { data, status } = required;
  const [primaryItem, ...secondaryItems] = data.items;

  return (
    <section className={styles.card} aria-busy={status.loadPhase === 'loading'}>
      <div className={styles.header}>
        <h2>Balances by currency</h2>
      </div>

      {status.loadPhase === 'failed' ? (
        <p className={styles.hint} role="alert">{status.error ?? 'Unable to load net worth.'}</p>
      ) : primaryItem ? (
        <div className={styles.summaryBody}>
          <div className={styles.primaryCurrency}>
            <span className={styles.currencyCode} data-currency-symbol={currencySymbol(primaryItem.currency)}>{primaryItem.currency}</span>
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
                    <span className={styles.currencyCode} data-currency-symbol={currencySymbol(item.currency)}>{item.currency}</span>
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
    </section>
  );
}

function currencySymbol(currency: string): string {
  if (currency === 'EUR') return '€';
  if (currency === 'USD') return '$';
  if (currency === 'GBP') return '£';
  return currency.slice(0, 1);
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
