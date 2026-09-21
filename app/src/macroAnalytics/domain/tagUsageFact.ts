import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type TagUsageFactSource = 'POSTED' | 'EXPECTED' | 'SCHEDULED';
export type TagUsageFactKind = 'INCOME' | 'EXPENSE';

export type TagUsageFact = Readonly<{
  id: string;
  occurredAt: string;
  source: TagUsageFactSource;
  kind: TagUsageFactKind;
  currency: string;
  amount: string;
  tagCount: number;
}>;

export function createTagUsageFact(input: TagUsageFact): TagUsageFact {
  if (!input.id.trim()) throw new Error('Tag usage fact id is required');
  if (!Number.isFinite(Date.parse(input.occurredAt)) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.occurredAt)) {
    throw new Error('Tag usage fact occurredAt must be a timezone-qualified instant');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Tag usage fact currency must be an uppercase three-letter code');
  if (ExactDecimal.from(input.amount).compare(ExactDecimal.from('0')) < 0) throw new Error('Tag usage fact amount must be non-negative');
  if (!Number.isSafeInteger(input.tagCount) || input.tagCount < 0) throw new Error('Tag usage fact tagCount must be a non-negative safe integer');

  return Object.freeze({ ...input });
}
