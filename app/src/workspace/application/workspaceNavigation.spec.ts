import { describe, expect, it } from 'vitest';
import { resolveWorkspaceRoutePage } from './workspaceNavigation';

describe('resolveWorkspaceRoutePage', () => {
  it('resolves search and its query parameters as movementsSearch', () => {
    expect(resolveWorkspaceRoutePage('/movements/search')).toBe('movementsSearch');
    expect(resolveWorkspaceRoutePage('/movements/search?source=expected&type=income')).toBe('movementsSearch');
  });

  it('keeps regular movement routes as movements', () => {
    expect(resolveWorkspaceRoutePage('/movements')).toBe('movements');
    expect(resolveWorkspaceRoutePage('/movements/2026-07')).toBe('movements');
  });

  it('resolves the movement entry screen before the generic movement route', () => {
    expect(resolveWorkspaceRoutePage('/movements/new')).toBe('movementNew');
  });

  it('keeps current workspace routes stable', () => {
    expect(resolveWorkspaceRoutePage('/')).toBe('home');
    expect(resolveWorkspaceRoutePage('/home')).toBe('home');
    expect(resolveWorkspaceRoutePage('/accounts')).toBe('home');
    expect(resolveWorkspaceRoutePage('/analytics')).toBe('analytics');
    expect(resolveWorkspaceRoutePage('/profile')).toBe('profile');
  });
});
