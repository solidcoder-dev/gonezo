export type WorkspaceRoutePage = 'analytics' | 'home' | 'movements' | 'profile';

export function resolveWorkspaceRoutePage(pathname: string): WorkspaceRoutePage {
  if (pathname.startsWith('/analytics')) {
    return 'analytics';
  }
  if (pathname.startsWith('/movements') && !pathname.startsWith('/movements/search')) {
    return 'movements';
  }
  if (pathname.startsWith('/profile')) {
    return 'profile';
  }
  return 'home';
}
