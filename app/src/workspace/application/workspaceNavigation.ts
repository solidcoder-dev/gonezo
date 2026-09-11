import { parseAnalyticsContext, serializeAnalyticsContext } from '../../analytics/application/analyticsContext';
import type { AnalyticsFilters } from '../../analytics/application/analyticsFilters';

export type WorkspaceRoutePage = 'analytics' | 'analyticsForecast' | 'home' | 'movementNew' | 'movements' | 'movementsSearch' | 'profile';

export type MovementEntryNavigationState = {
  returnTo: string;
};

export function readMovementEntryReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) {
    return null;
  }
  const returnTo = state.returnTo;
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.startsWith('/\\')) {
    return null;
  }
  const parsed = new URL(returnTo, 'https://gonezo.invalid');
  return parsed.origin === 'https://gonezo.invalid' && parsed.pathname !== '/movements/new'
    ? returnTo
    : null;
}

export function resolveWorkspaceRoutePage(pathname: string): WorkspaceRoutePage {
  if (pathname === '/analytics/forecast') {
    return 'analyticsForecast';
  }
  if (pathname === '/analytics') {
    return 'analytics';
  }
  if (pathname === '/movements/search' || pathname.startsWith('/movements/search?')) {
    return 'movementsSearch';
  }
  if (pathname === '/movements/new') {
    return 'movementNew';
  }
  if (pathname.startsWith('/movements') && !pathname.startsWith('/movements/search')) {
    return 'movements';
  }
  if (pathname.startsWith('/profile')) {
    return 'profile';
  }
  return 'home';
}

export function analyticsRouteForContext(filters: AnalyticsFilters, periodShift = 0): string {
  const serialized = serializeAnalyticsContext(filters, periodShift);
  return `/analytics${serialized ? `?${serialized}` : ''}`;
}

export function shouldSyncAnalyticsContext(search: string, filters: AnalyticsFilters, periodShift = 0): boolean {
  return serializeAnalyticsContext(parseAnalyticsContext(search), parseAnalyticsContext(search).periodShift) !== serializeAnalyticsContext(filters, periodShift);
}
