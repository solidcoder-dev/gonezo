import { useRef, useState } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import { currencySymbol } from '../../../shared/utils/formatting';
import styles from './NetWorthSummaryView.module.css';
import { buildSmoothedTrendPath, TREND_AREA_BASELINE, TREND_HORIZONTAL_PLOT_PADDING } from './netWorthTrendPath';

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
  Record<string, never>,
  { items: NetWorthCurrencyView[] },
  { activeIndex?: number },
  { loadPhase: 'idle' | 'loading' | 'succeeded' | 'failed'; error?: string },
  { onViewAccountsRequested?: (currency: string) => void }
>;

export function NetWorthSummaryView({ required, provided }: NetWorthSummaryViewProps) {
  const { data, status } = required;
  const viewportRef = useRef<HTMLDivElement>(null);
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

  function selectSlide(index: number) {
    const item = data.items[index];
    if (!item) {
      return;
    }
    setActiveCurrency(item.currency);
    const viewport = viewportRef.current;
    const slide = viewport?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  function updateActiveSlide(target: HTMLDivElement) {
    const slides = Array.from(target.children) as HTMLElement[];
    const nearestIndex = slides.reduce((closestIndex, slide, index) => (
      Math.abs(slide.offsetLeft - target.scrollLeft)
        < Math.abs(slides[closestIndex].offsetLeft - target.scrollLeft)
        ? index
        : closestIndex
    ), 0);
    setActiveCurrency(data.items[nearestIndex]?.currency ?? preferredCurrency);
  }

  return (
    <section className={styles.card} aria-busy={status.loadPhase === 'loading'}>
      <div className={styles.header}><h2>Balances by currency</h2></div>
      {status.loadPhase === 'failed' ? (
        <p className={styles.hint} role="alert">{status.error ?? 'Unable to load net worth.'}</p>
      ) : status.loadPhase === 'loading' && !activeItem ? (
        <p className={styles.hint}>Loading balances...</p>
      ) : activeItem ? (
        <>
          <div
            className={styles.viewport}
            ref={viewportRef}
            aria-label="Balances by currency"
            onScroll={(event) => {
              const target = event.currentTarget;
              updateActiveSlide(target);
            }}
          >
            {data.items.map((item, index) => (
              <article
                className={styles.slide}
                key={item.currency}
                aria-label={`${item.currency}, currency ${index + 1} of ${data.items.length}`}
              >
                <div className={styles.currencyHeading}>
                  <span className={styles.currencySymbol} aria-hidden>{currencySymbol(item.currency)}</span>
                  <span>{item.currency}</span>
                </div>
                <strong className={styles.balance}>{item.formattedBalance}</strong>
                {item.trend ? <div className={styles.trend} aria-label={item.trend.ariaLabel}><NetWorthTrendLine currency={item.currency} points={item.trend.points} /></div> : null}
                <div className={styles.footer}>
                  <span>
                    <i className={`bi bi-bank ${styles.accountCountIcon}`} aria-hidden="true" />
                    {' '}
                    {item.accountCount === 1 ? '1 account' : `${item.accountCount ?? 0} accounts`}
                  </span>
                  <button type="button" onClick={() => provided.commands.onViewAccountsRequested?.(item.currency)} aria-label={`See all ${item.currency} accounts`}>
                    See all <i className="bi bi-chevron-right" aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {data.items.length > 1 ? (
            <div className={styles.indicators} aria-label="Choose currency">
              {data.items.map((item, index) => (
                <button
                  className={styles.indicatorButton}
                  type="button"
                  key={item.currency}
                  aria-label={`Show ${item.currency}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => selectSlide(index)}
                >
                  <span className={styles.indicatorDot} aria-hidden />
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className={styles.hint}>No balances yet</p>
      )}
    </section>
  );
}

function NetWorthTrendLine({ currency, points }: { currency: string; points: Array<{ value: number }> }) {
  if (points.length === 0) return null;
  const path = buildSmoothedTrendPath(points.map((point) => point.value));
  if (!path) return null;
  const area = `${path} L ${100 - TREND_HORIZONTAL_PLOT_PADDING} ${TREND_AREA_BASELINE} L ${TREND_HORIZONTAL_PLOT_PADDING} ${TREND_AREA_BASELINE} Z`;
  const gradientId = `net-worth-trend-area-${currency.toLowerCase()}`;
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--net-worth-area-start)" />
          <stop offset="55%" stopColor="var(--net-worth-area-middle)" />
          <stop offset="100%" stopColor="var(--net-worth-area-end)" />
        </linearGradient>
      </defs>
      <path className={styles.trendArea} d={area} style={{ fill: `url(#${gradientId})` }} />
      <path className={styles.trendLine} d={path} />
    </svg>
  );
}
