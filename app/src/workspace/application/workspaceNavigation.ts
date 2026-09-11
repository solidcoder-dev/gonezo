import { parseAnalyticsContext, serializeAnalyticsContext } from '../../analytics/application/analyticsContext';
import type { AnalyticsFilters } from '../../analytics/application/analyticsFilters';

export type WorkspaceRoutePage = 'analytics' | 'analyticsForecast' | 'home' | 'movementNew' | 'movements' | 'movementsSearch' | 'profile';

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

export function analyticsRouteForContext(filters: AnalyticsFilters): string {
  const serialized = serializeAnalyticsContext(filters);
  return `/analytics${serialized ? `?${serialized}` : ''}`;
}

export function shouldSyncAnalyticsContext(search: string, filters: AnalyticsFilters): boolean {
  return serializeAnalyticsContext(parseAnalyticsContext(search)) !== serializeAnalyticsContext(filters);
}
