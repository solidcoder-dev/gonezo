import type { LedgerTransactionType } from '../../ledger/application/ledger.port';

export function normalizeMovementReuseTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

export type MovementReuseCandidate = {
  id: string;
  title: string;
  accountId: string;
  accountName: string;
  type: LedgerTransactionType;
  categoryId?: string;
  categoryName?: string;
  tagIds: string[];
  itemNames: string[];
  sharePersonIds: string[];
  lastUsedAt: string;
};

export type MovementReuseVariant = {
  representativeMovementId: string;
  accountId: string;
  accountName: string;
  financialType: LedgerTransactionType;
  category?: { id: string; name: string };
  tags: Array<{ id: string; name: string }>;
  itemCount: number;
  shareCount: number;
  usageCount: number;
  lastUsedAt: string;
  deterministicKey: string;
};

export type MovementReuseSuggestionGroup = {
  title: string;
  normalizedTitle: string;
  variantCount: number;
  primaryVariant: MovementReuseVariant;
};

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function variantKey(candidate: MovementReuseCandidate): string {
  return JSON.stringify([
    candidate.accountId,
    candidate.type,
    candidate.categoryId ?? '',
    sortedUnique(candidate.tagIds),
    sortedUnique(candidate.itemNames),
    sortedUnique(candidate.sharePersonIds),
  ]);
}

function candidateToVariant(candidate: MovementReuseCandidate, usageCount: number): MovementReuseVariant {
  return {
    representativeMovementId: candidate.id,
    accountId: candidate.accountId,
    accountName: candidate.accountName,
    financialType: candidate.type,
    category: candidate.categoryId && candidate.categoryName
      ? { id: candidate.categoryId, name: candidate.categoryName }
      : undefined,
    tags: sortedUnique(candidate.tagIds).map((id) => ({ id, name: id })),
    itemCount: candidate.itemNames.length,
    shareCount: candidate.sharePersonIds.length,
    usageCount,
    lastUsedAt: candidate.lastUsedAt,
    deterministicKey: variantKey(candidate),
  };
}

function compareVariants(left: MovementReuseVariant, right: MovementReuseVariant): number {
  return right.usageCount - left.usageCount
    || right.lastUsedAt.localeCompare(left.lastUsedAt)
    || left.deterministicKey.localeCompare(right.deterministicKey)
    || left.representativeMovementId.localeCompare(right.representativeMovementId);
}

function variantsFor(candidates: MovementReuseCandidate[]): MovementReuseVariant[] {
  const grouped = new Map<string, { candidate: MovementReuseCandidate; usageCount: number }>();
  for (const candidate of candidates) {
    const key = variantKey(candidate);
    const current = grouped.get(key);
    if (current) {
      current.usageCount += 1;
      if (candidate.lastUsedAt > current.candidate.lastUsedAt) {
        current.candidate = candidate;
      }
    } else {
      grouped.set(key, { candidate, usageCount: 1 });
    }
  }
  return [...grouped.values()]
    .map(({ candidate, usageCount }) => candidateToVariant(candidate, usageCount))
    .sort(compareVariants);
}

export function groupMovementReuseSuggestions(
  candidates: MovementReuseCandidate[],
  query: string,
  limit = 5,
): MovementReuseSuggestionGroup[] {
  const normalizedQuery = normalizeMovementReuseTitle(query);
  if (!normalizedQuery) return [];

  const groups = new Map<string, MovementReuseCandidate[]>();
  for (const candidate of candidates) {
    const normalizedTitle = normalizeMovementReuseTitle(candidate.title);
    if (!normalizedTitle.includes(normalizedQuery)) continue;
    const current = groups.get(normalizedTitle) ?? [];
    current.push(candidate);
    groups.set(normalizedTitle, current);
  }

  return [...groups.entries()]
    .map(([normalizedTitle, groupCandidates]) => {
      const variants = variantsFor(groupCandidates);
      return {
        title: groupCandidates.find((candidate) => normalizeMovementReuseTitle(candidate.title) === normalizedTitle)?.title.trim() ?? normalizedTitle,
        normalizedTitle,
        variantCount: variants.length,
        primaryVariant: variants[0],
      };
    })
    .sort((left, right) => {
      const exact = Number(right.normalizedTitle === normalizedQuery) - Number(left.normalizedTitle === normalizedQuery);
      const prefix = Number(right.normalizedTitle.startsWith(normalizedQuery)) - Number(left.normalizedTitle.startsWith(normalizedQuery));
      return exact || prefix
        || right.primaryVariant.usageCount - left.primaryVariant.usageCount
        || right.primaryVariant.lastUsedAt.localeCompare(left.primaryVariant.lastUsedAt)
        || left.normalizedTitle.localeCompare(right.normalizedTitle);
    })
    .slice(0, Math.max(0, limit));
}

export function listMovementReuseVariants(
  candidates: MovementReuseCandidate[],
  normalizedTitle: string,
): MovementReuseVariant[] {
  return variantsFor(candidates.filter((candidate) => normalizeMovementReuseTitle(candidate.title) === normalizedTitle));
}
