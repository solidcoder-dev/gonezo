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
});
