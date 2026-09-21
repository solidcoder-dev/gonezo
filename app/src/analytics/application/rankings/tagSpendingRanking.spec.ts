import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import { buildTagSpendingRanking, type TagSpendingFact } from './tagSpendingRanking';

describe('buildTagSpendingRanking', () => {
  it('uses exact personal posted expenses, counts each movement once per tag, and permits overlap', () => {
    const facts: TagSpendingFact[] = [
      fact('one', '0.10', [tag('tag-a', 'A'), tag('tag-b', 'B'), tag('tag-a', 'A')]),
      fact('two', '0.20', [tag('tag-a', 'A'), tag('tag-b', 'B')]),
      fact('scheduled', '20.00', [tag('tag-a', 'A')], 'SCHEDULED_PROJECTION'),
      fact('income', '30.00', [tag('tag-a', 'A')], 'POSTED', 'income'),
      fact('other-currency', '40.00', [tag('tag-a', 'A')], 'POSTED', 'expense', 'USD'),
    ];

    const ranking = buildTagSpendingRanking(facts, 'EUR');

    expect(ranking).toEqual([
      { key: 'tag:tag-a', tagId: 'tag-a', displayName: 'A', amount: '0.30', movementCount: 2 },
      { key: 'tag:tag-b', tagId: 'tag-b', displayName: 'B', amount: '0.30', movementCount: 2 },
    ]);
    const totalPostedSpending = facts.slice(0, 2).reduce((sum, item) => sum.add(ExactDecimal.from(item.personalAmount)), ExactDecimal.from('0'));
    const overlappingTagSpend = ranking.reduce((sum, item) => sum.add(ExactDecimal.from(item.amount)), ExactDecimal.from('0'));
    expect(totalPostedSpending.toFixed(2)).toBe('0.30');
    expect(overlappingTagSpend.toFixed(2)).toBe('0.60');
  });

  it('sorts by amount, movement count, then key and omits untagged movements', () => {
    expect(buildTagSpendingRanking([
      fact('z', '4.00', [tag('tag-z', 'Z')]),
      fact('b', '2.00', [tag('tag-b', 'B')]),
      fact('a', '2.00', [tag('tag-a', 'A')]),
      fact('a-two', '2.00', [tag('tag-a', 'A')]),
      fact('untagged', '100.00', []),
    ], 'EUR')).toEqual([
      { key: 'tag:tag-a', tagId: 'tag-a', displayName: 'A', amount: '4.00', movementCount: 2 },
      { key: 'tag:tag-z', tagId: 'tag-z', displayName: 'Z', amount: '4.00', movementCount: 1 },
      { key: 'tag:tag-b', tagId: 'tag-b', displayName: 'B', amount: '2.00', movementCount: 1 },
    ]);
  });
});

function fact(
  movementId: string,
  personalAmount: string,
  tags: TagSpendingFact['tags'],
  source: TagSpendingFact['source'] = 'POSTED',
  type: TagSpendingFact['type'] = 'expense',
  currency = 'EUR',
): TagSpendingFact {
  return { movementId, source, type, currency, personalAmount, tags };
}

function tag(tagId: string, displayName: string): TagSpendingFact['tags'][number] {
  return { key: `tag:${tagId}`, tagId, displayName };
}
