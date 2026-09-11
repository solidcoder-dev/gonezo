export type WorkspaceRoutePage = 'analytics' | 'analyticsCategory' | 'analyticsForecast' | 'home' | 'movementNew' | 'movements' | 'movementsSearch' | 'profile';

export function resolveWorkspaceRoutePage(pathname: string): WorkspaceRoutePage {
  if (pathname.startsWith('/analytics/category/')) {
    return 'analyticsCategory';
  }
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
