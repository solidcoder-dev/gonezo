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
  const month = params.get('month');
  const mode = params.get('mode');
  return {
    month: isValidMonth(month) ? month : currentMonth(clock),
    mode: isValidMode(mode) ? mode : 'posted',
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

export function monthlyMovementsMonthToDate(month: string): Date {
  const match = month.match(MONTH_PATTERN);
  if (!match) {
    throw new Error(`Invalid monthly movements month: ${month}`);
  }
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, 1);
  return date;
}
