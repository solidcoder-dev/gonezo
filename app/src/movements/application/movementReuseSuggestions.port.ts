import type { LedgerTransactionType } from '../../ledger/application/ledger.port';

export type MovementReuseSuggestionVariant = {
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
  primaryVariant: MovementReuseSuggestionVariant;
};

export type MovementReuseSuggestionsSearchInput = {
  query: string;
  accountIds: string[];
  limit?: number;
};

export type MovementReuseSuggestionsSearchResult = {
  groups: MovementReuseSuggestionGroup[];
};

export type MovementReuseSuggestionsVariantsInput = {
  normalizedTitle: string;
  accountIds: string[];
};

export type MovementReuseSuggestionsVariantsResult = {
  variants: MovementReuseSuggestionVariant[];
};

export interface MovementReuseSuggestionsPort {
  movementReuseSearchGroups(input: MovementReuseSuggestionsSearchInput): Promise<MovementReuseSuggestionsSearchResult>;
  movementReuseListVariants(input: MovementReuseSuggestionsVariantsInput): Promise<MovementReuseSuggestionsVariantsResult>;
}
