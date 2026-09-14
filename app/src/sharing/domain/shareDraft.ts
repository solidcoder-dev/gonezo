export type ShareMode = 'equal' | 'parts' | 'amounts';

export type ShareSettlementChoice = 'not_required' | 'pending' | 'settled';

export type SharePersonDraft = {
  id: string;
  personId?: string;
  name: string;
  email?: string;
  settlementChoice?: ShareSettlementChoice;
  reimbursable?: boolean;
  parts: number;
  amount: string;
  avatarTone: 'you' | 'emma' | 'luis' | 'maria' | 'john' | 'alex' | 'alexandra' | 'ali' | 'custom';
};

export type ShareDraft = {
  mode: ShareMode;
  people: SharePersonDraft[];
};

export type SharingPersonSuggestion = {
  id: string;
  name: string;
  email?: string;
};
