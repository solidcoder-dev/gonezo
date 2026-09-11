export type MonthlyMovementsMode = 'posted' | 'planned';

export type MonthlyMovementsRouteState = {
  month: string;
  mode: MonthlyMovementsMode;
};

type MonthlyMovementsRouteClock = {
  now(): Date;
};

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function currentMonth(clock: MonthlyMovementsRouteClock): string {
  const now = clock.now();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isValidMonth(value: string | null): value is string {
  return value !== null && MONTH_PATTERN.test(value);
}

function isValidMode(value: string | null): value is MonthlyMovementsMode {
  return value === 'posted' || value === 'planned';
}

export function decodeMonthlyMovementsRouteState(
  search: string,
  clock: MonthlyMovementsRouteClock,
): MonthlyMovementsRouteState {
  const params = new URLSearchParams(search);
  return {
    month: isValidMonth(params.get('month')) ? params.get('month')! : currentMonth(clock),
    mode: isValidMode(params.get('mode')) ? params.get('mode')! : 'posted',
  };
}

export function serializeMonthlyMovementsRouteState(
  search: string,
  state: MonthlyMovementsRouteState,
): string {
  const params = new URLSearchParams(search);
  params.set('month', state.month);
  params.set('mode', state.mode);
  return params.toString();
}

export function monthlyMovementsRouteStateNeedsNormalization(
  search: string,
  state: MonthlyMovementsRouteState,
): boolean {
  return serializeMonthlyMovementsRouteState(search, state) !== new URLSearchParams(search).toString();
}
