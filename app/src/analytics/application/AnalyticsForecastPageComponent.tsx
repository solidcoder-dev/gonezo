import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import { ForecastComponent } from './ForecastComponent';

export function AnalyticsForecastPageComponent({ core, filters, currency, refreshSignal, amountVisibility, onError }: {
  core: AnalyticsPort;
  filters?: AnalyticsFiltersInput;
  currency: string;
  refreshSignal: boolean;
  amountVisibility?: AmountVisibility;
  onError?: (error: { message: string }) => void;
}) {
  return (
    <main className="d-grid gap-4" aria-label="Forecast">
      <h2 className="m-0">Forecast</h2>
      <ForecastComponent core={core} currency={currency} filters={filters} refreshSignal={refreshSignal} amountVisibility={amountVisibility} onError={onError} />
    </main>
  );
}
