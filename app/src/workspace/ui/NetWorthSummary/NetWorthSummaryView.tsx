import { useState } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import { currencySymbol } from '../../../shared/utils/formatting';
import styles from './NetWorthSummaryView.module.css';
import { buildSmoothedTrendPath } from './netWorthTrendPath';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';

export type NetWorthCurrencyView = {
  currency: string;
  balanceAmount: string;
  formattedBalance: string;
  accountCount?: number;
  isPreferred?: boolean;
  trend?: {
    points: Array<{ value: number }>;
    ariaLabel: string;
  };
};

export type NetWorthSummaryViewProps = ViewProps<
  { amountVisibility?: AmountVisibility },
  { items: NetWorthCurrencyView[] },
  { activeIndex?: number },
  { loadPhase: 'idle' | 'loading' | 'succeeded' | 'failed'; error?: string },
  { onViewAccountsRequested?: (currency: string) => void }
>;

export function NetWorthSummaryView({ required, provided }: NetWorthSummaryViewProps) {
  const { data, status } = required;
  const preferredCurrency = data.items.find((item) => item.isPreferred)?.currency ?? data.items[0]?.currency ?? null;
  const [activeCurrency, setActiveCurrency] = useState(
    required.state.activeIndex === undefined
      ? preferredCurrency
      : data.items[required.state.activeIndex]?.currency ?? preferredCurrency,
  );
  const resolvedActiveCurrency = data.items.some((item) => item.currency === activeCurrency)
    ? activeCurrency
    : preferredCurrency;
  const activeIndex = Math.max(0, data.items.findIndex((item) => item.currency === resolvedActiveCurrency));
  const activeItem = data.items[activeIndex] ?? data.items.find((item) => item.currency === preferredCurrency) ?? data.items[0];

  return (
    <section className={styles.section} aria-busy={status.loadPhase === 'loading'}>
      <div className={`${styles.header} d-flex align-items-center justify-content-between gap-2`}>
        <h2 className={`${styles.sectionLabel} text-uppercase m-0`}>Balances by currency</h2>
      </div>
      {status.loadPhase === 'failed' ? (
        <p className={styles.netWorthHint} role="alert">{status.error ?? 'Unable to load net worth.'}</p>
      ) : status.loadPhase === 'loading' && !activeItem ? (
        <p className={styles.netWorthHint}>Loading balances...</p>
      ) : activeItem ? (
        <div className={styles.content} aria-label="Balances by currency">
          <article className={styles.slide} aria-label={`${activeItem.currency}, selected currency`}>
                <div className={`${styles.currencyHeading} d-flex align-items-center gap-1`}>
                  <span className={styles.currencySymbol} aria-hidden>{currencySymbol(activeItem.currency)}</span>
                  <label className="visually-hidden" htmlFor="balance-currency-select">Choose balance currency</label>
                  <select
                    id="balance-currency-select"
                    className={`${styles.currencySelect} form-select form-select-sm w-auto border-0 bg-transparent`}
                    value={resolvedActiveCurrency ?? ''}
                    disabled={data.items.length < 2}
                    onChange={(event) => setActiveCurrency(event.target.value)}
                  >
                    {data.items.map((item) => <option key={item.currency} value={item.currency}>{item.currency}</option>)}
                  </select>
                </div>
                <strong className={styles.balance}><FinancialAmountView formattedAmount={activeItem.formattedBalance} visibility={required.config.amountVisibility ?? 'visible'} /></strong>
                {activeItem.trend ? <div className={styles.trend} aria-label={activeItem.trend.ariaLabel}><NetWorthTrendLine points={activeItem.trend.points} /></div> : null}
                <div className={`${styles.footer} d-flex align-items-center justify-content-between gap-2`}>
                  <span className={`${styles.metadata} d-inline-flex align-items-center gap-2`}>
                    <i className={`bi bi-bank ${styles.accountCountIcon}`} aria-hidden="true" />
                    {' '}
                    {activeItem.accountCount === 1 ? '1 account' : `${activeItem.accountCount ?? 0} accounts`}
                  </span>
                  <button className="d-inline-flex align-items-center gap-1" type="button" onClick={() => provided.commands.onViewAccountsRequested?.(activeItem.currency)} aria-label={`See all ${activeItem.currency} accounts`}>
                    See all <i className="bi bi-chevron-right" aria-hidden />
                  </button>
                </div>
          </article>
        </div>
      ) : (
        <p className={styles.netWorthHint}>No balances yet</p>
      )}
    </section>
  );
}

function NetWorthTrendLine({ points }: { points: Array<{ value: number }> }) {
  if (points.length === 0) return null;
  const path = buildSmoothedTrendPath(points.map((point) => point.value));
  if (!path) return null;
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
      <path className={styles.trendLine} d={path} />
    </svg>
  );
}
