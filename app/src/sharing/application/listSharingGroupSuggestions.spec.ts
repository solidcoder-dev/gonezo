import { describe, expect, it } from 'vitest';
import { listSharingGroupSuggestions } from './listSharingGroupSuggestions';

describe('historical sharing group suggestions', () => {
  it('groups the same people regardless of order and excludes the owner', () => {
    const suggestions = listSharingGroupSuggestions(
      [
        { ownerId: 'you', participantIds: ['luis', 'emma'], usedAt: '2026-06-01T10:00:00Z' },
        { ownerId: 'you', participantIds: ['emma', 'luis', 'you'], usedAt: '2026-06-02T10:00:00Z' },
      ],
      [{ id: 'emma', name: 'Emma Updated' }, { id: 'luis', name: 'Luis' }, { id: 'you', name: 'You' }],
    );

    expect(suggestions).toEqual([{
      key: 'emma|luis',
      people: [{ id: 'emma', name: 'Emma Updated' }, { id: 'luis', name: 'Luis' }],
      usageCount: 2,
      lastUsedAt: '2026-06-02T10:00:00Z',
    }]);
  });

  it('ignores archived or unknown people while retaining stable group identity', () => {
    const suggestions = listSharingGroupSuggestions(
      [{ ownerId: 'you', participantIds: ['emma', 'archived'], usedAt: '2026-06-02T10:00:00Z' }],
      [{ id: 'emma', name: 'Emma' }],
    );

    expect(suggestions[0].key).toBe('emma');
  });
});
