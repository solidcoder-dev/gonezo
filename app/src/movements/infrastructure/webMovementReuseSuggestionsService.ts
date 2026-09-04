import type { WebAppState } from '../../core/infrastructure/webAppState';
import type {
  MovementReuseSuggestionsPort,
  MovementReuseSuggestionsSearchInput,
  MovementReuseSuggestionsSearchResult,
  MovementReuseSuggestionsVariantsInput,
  MovementReuseSuggestionsVariantsResult,
} from '../application/movementReuseSuggestions.port';
import {
  groupMovementReuseSuggestions,
  listMovementReuseVariants,
  type MovementReuseCandidate,
} from '../application/movementReuseSuggestions';

export class WebMovementReuseSuggestionsService implements MovementReuseSuggestionsPort {
  private readonly state: WebAppState;

  constructor(state: WebAppState) {
    this.state = state;
  }

  async movementReuseSearchGroups(input: MovementReuseSuggestionsSearchInput): Promise<MovementReuseSuggestionsSearchResult> {
    return { groups: groupMovementReuseSuggestions(this.candidates(input.accountIds), input.query, input.limit ?? 5) };
  }

  async movementReuseListVariants(input: MovementReuseSuggestionsVariantsInput): Promise<MovementReuseSuggestionsVariantsResult> {
    return { variants: listMovementReuseVariants(this.candidates(input.accountIds), input.normalizedTitle) };
  }

  private candidates(accountIds: string[]): MovementReuseCandidate[] {
    const scope = accountIds.length > 0 ? new Set(accountIds) : null;
    const accountById = new Map(this.state.ledgerAccounts.map((account) => [account.id, account]));
    const categoryById = new Map(this.state.taxonomyCategories.map((category) => [category.id, category]));
    const tagById = new Map(this.state.taxonomyTags.map((tag) => [tag.id, tag]));
    const personById = new Map(this.state.sharingPersons.map((person) => [person.id, person]));
    const shareByTransactionId = new Map(this.state.expenseShares.map((share) => [share.transactionId, share]));
    return this.state.ledgerTransactions
      .filter((transaction) => transaction.status === 'posted' && (!scope || scope.has(transaction.accountId)))
      .map((transaction) => {
        const account = accountById.get(transaction.accountId);
        const tags = this.state.taxonomyTransactionTags.get(transaction.id) ?? [];
        const share = shareByTransactionId.get(transaction.id);
        const title = transaction.merchant?.trim() || transaction.description?.trim() || '';
        return {
          id: transaction.id,
          title,
          accountId: transaction.accountId,
          accountName: account?.name ?? transaction.accountId,
          type: transaction.type,
          categoryId: transaction.categoryId,
          categoryName: transaction.categoryId ? categoryById.get(transaction.categoryId)?.name : undefined,
          tagIds: tags.filter((id) => tagById.get(id)?.status === 'active'),
          itemNames: transaction.items.map((item) => item.name),
          sharePersonIds: share?.participants.map((participant) => participant.personId).filter((id) => personById.get(id)?.archivedAt == null) ?? [],
          lastUsedAt: transaction.occurredAt,
        } satisfies MovementReuseCandidate;
      })
      .filter((candidate) => candidate.title.length > 0);
  }
}
