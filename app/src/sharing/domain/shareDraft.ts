export type ShareMode = 'equal' | 'parts' | 'amounts';

export type ShareSettlementChoice = 'not_required' | 'pending' | 'settled';

type ShareDraftMemberBase = {
  readonly id: string;
  name: string;
  email?: string;
  parts: number;
  amount: string;
  avatarTone: 'you' | 'emma' | 'luis' | 'maria' | 'john' | 'alex' | 'alexandra' | 'ali' | 'custom';
};

export type ShareMemberDraft =
  | (ShareDraftMemberBase & { readonly role: 'owner'; includedInAllocation?: boolean })
  | (ShareDraftMemberBase & { readonly role: 'participant'; readonly personId?: string; settlementChoice: ShareSettlementChoice });

export type ShareDraft = {
  readonly mode: ShareMode;
  readonly people: ShareMemberDraft[];
};

export type SharingPersonSuggestion = {
  readonly id: string;
  readonly name: string;
  email?: string;
};

export type ShareSelectionCandidate =
  | { readonly kind: 'owner'; readonly name: 'You' }
  | { readonly kind: 'person'; readonly person: SharingPersonSuggestion };

export type SharingGroupSuggestion = {
  readonly key: string;
  readonly people: readonly SharingPersonSuggestion[];
  readonly usageCount: number;
  readonly lastUsedAt: string;
};
