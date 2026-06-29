export type ShareMode = 'parts' | 'amounts';

export type SharePersonDraft = {
  id: string;
  name: string;
  email?: string;
  reimbursable: boolean;
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
