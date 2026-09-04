import type { WebAppState } from '../../core/infrastructure/webAppState';
import type {
  MovementReuseSuggestionsPort,
  MovementReuseSuggestionsSearchInput,
  MovementReuseSuggestionsSearchResult,
  MovementReuseSuggestionsVariantsInput,
  MovementReuseSuggestionsVariantsResult,
  MovementReuseTemplate,
  MovementReuseTemplatePort,
} from '../application/movementReuseSuggestions.port';
import {
  groupMovementReuseSuggestions,
  listMovementReuseVariants,
  type MovementReuseCandidate,
} from '../application/movementReuseSuggestions';

export class WebMovementReuseSuggestionsService implements MovementReuseSuggestionsPort, MovementReuseTemplatePort {
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

  async movementReuseGetTemplate(input: { representativeMovementId: string }): Promise<MovementReuseTemplate> {
    const transaction = this.state.ledgerTransactions.find((item) => item.id === input.representativeMovementId && item.status === 'posted');
    if (!transaction) throw new Error('Movement reuse template not found');
    const account = this.state.ledgerAccounts.find((item) => item.id === transaction.accountId);
    const category = this.state.taxonomyCategories.find((item) => item.id === transaction.categoryId && item.status === 'active' && item.appliesTo === transaction.type);
    const tagById = new Map(this.state.taxonomyTags.map((tag) => [tag.id, tag]));
    const tags = (this.state.taxonomyTransactionTags.get(transaction.id) ?? [])
      .map((id) => tagById.get(id)).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag && tag.status === 'active'))
      .map((tag) => ({ id: tag.id, name: tag.name }));
    const share = this.state.expenseShares.find((item) => item.transactionId === transaction.id);
    const peopleById = new Map(this.state.sharingPersons.map((person) => [person.id, person]));
    const sharingPeople = share?.participants.map((participant) => {
      const person = peopleById.get(participant.personId);
      return person ? { id: person.id, name: person.name, reimbursable: participant.reimbursable, parts: undefined } : undefined;
    }).filter((person): person is NonNullable<typeof person> => Boolean(person)) ?? [];
    const targetAccountId = transaction.linkedTransactionId
      ? this.state.ledgerTransactions.find((item) => item.id === transaction.linkedTransactionId)?.accountId
      : undefined;
    return {
      representativeMovementId: transaction.id,
      title: transaction.merchant?.trim() || transaction.description?.trim() || '',
      accountId: transaction.accountId,
      accountName: account?.name ?? transaction.accountId,
      financialType: transaction.type,
      category: category ? { id: category.id, name: category.name } : undefined,
      tags,
      itemNames: transaction.items.map((item) => item.name),
      sharingPeople,
      targetAccountId,
      ignored: this.state.analyticsExclusions.some((item) => item.scopeType === 'movement' && item.scopeId === transaction.id && item.reason === 'user_ignored'),
    };
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
          categoryName: transaction.categoryId
            ? categoryById.get(transaction.categoryId)?.status === 'active' && categoryById.get(transaction.categoryId)?.appliesTo === transaction.type
              ? categoryById.get(transaction.categoryId)?.name
              : undefined
            : undefined,
          tagIds: tags.filter((id) => tagById.get(id)?.status === 'active'),
          tagNames: Object.fromEntries(tags.map((id) => [id, tagById.get(id)?.name ?? id])),
          itemNames: transaction.items.map((item) => item.name),
          sharePersonIds: share?.participants.map((participant) => participant.personId).filter((id) => personById.get(id)?.archivedAt == null) ?? [],
          lastUsedAt: transaction.occurredAt,
        } satisfies MovementReuseCandidate;
      })
      .filter((candidate) => candidate.title.length > 0);
  }
}
