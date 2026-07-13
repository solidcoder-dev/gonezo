import { normalizeTaxonomyName, resolveKnownTagSelectionIds } from '../../transactions/application/transactionTaxonomySelection';
import type { ExpectedUpdateMovementInput } from '../../expected/application/expected.port';
import type { SchedulingUpdateMovementInput } from '../../scheduling/application/scheduling.port';
import type { TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import type { MovementDetailTagView } from './movementDetailView.types';

function uniqueTagNames(tags: MovementDetailTagView[]): string[] {
  const uniqueByName = new Map<string, string>();
  for (const tag of tags) {
    const trimmed = tag.name.trim();
    const normalized = normalizeTaxonomyName(trimmed);
    if (!normalized || uniqueByName.has(normalized)) {
      continue;
    }
    uniqueByName.set(normalized, trimmed);
  }
  return [...uniqueByName.values()];
}

export function buildScheduledCategoryUpdateInput(
  movement: ScheduledMovementView,
  categoryId?: string,
): SchedulingUpdateMovementInput {
  return {
    recurringMovementId: movement.id,
    type: movement.type,
    sourceAccountId: movement.sourceAccountId,
    targetAccountId: movement.targetAccountId,
    amount: movement.amount,
    currency: movement.currency,
    destinationAmount: movement.destinationAmount,
    destinationCurrency: movement.destinationCurrency,
    exchangeRate: movement.exchangeRate,
    description: movement.description,
    merchant: movement.merchant,
    categoryId,
    splitItems: movement.splitItems,
    tagIds: movement.tagIds,
    tagNames: movement.tagNames,
    rule: movement.rule,
    recurrenceEnd: movement.recurrenceEnd,
    startAt: movement.startAt,
    zoneId: movement.zoneId,
    reviewPolicy: movement.reviewPolicy,
    scheduleKind: movement.scheduleKind,
  };
}

export function buildScheduledTagsUpdateInput(
  movement: ScheduledMovementView,
  tags: MovementDetailTagView[],
  availableTags: TaxonomyTagItem[],
): SchedulingUpdateMovementInput {
  const tagNames = uniqueTagNames(tags);
  return {
    recurringMovementId: movement.id,
    type: movement.type,
    sourceAccountId: movement.sourceAccountId,
    targetAccountId: movement.targetAccountId,
    amount: movement.amount,
    currency: movement.currency,
    destinationAmount: movement.destinationAmount,
    destinationCurrency: movement.destinationCurrency,
    exchangeRate: movement.exchangeRate,
    description: movement.description,
    merchant: movement.merchant,
    ...(movement.type === 'transfer' ? {} : { categoryId: movement.categoryId }),
    splitItems: movement.splitItems,
    tagIds: resolveKnownTagSelectionIds(tagNames, availableTags),
    tagNames,
    rule: movement.rule,
    recurrenceEnd: movement.recurrenceEnd,
    startAt: movement.startAt,
    zoneId: movement.zoneId,
    reviewPolicy: movement.reviewPolicy,
    scheduleKind: movement.scheduleKind,
  };
}

export function buildExpectedCategoryUpdateInput(
  movement: ExpectedMovementView,
  categoryId?: string,
): ExpectedUpdateMovementInput {
  return {
    expectedMovementId: movement.id,
    accountId: movement.accountId,
    type: movement.type,
    amount: movement.amount,
    currency: movement.currency,
    expectedAt: movement.expectedAt,
    description: movement.description,
    merchant: movement.merchant,
    categoryId,
    ignored: movement.ignored,
    splitItems: movement.splitItems,
  };
}

export function buildExpectedIgnoredUpdateInput(
  movement: ExpectedMovementView,
  ignored: boolean,
): ExpectedUpdateMovementInput {
  return {
    expectedMovementId: movement.id,
    accountId: movement.accountId,
    type: movement.type,
    amount: movement.amount,
    currency: movement.currency,
    expectedAt: movement.expectedAt,
    description: movement.description,
    merchant: movement.merchant,
    categoryId: movement.categoryId,
    ignored,
    splitItems: movement.splitItems,
  };
}
