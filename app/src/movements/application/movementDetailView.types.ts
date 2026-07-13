import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';

export type MovementDetailSelection = {
  source: 'posted' | 'scheduled' | 'expected';
  id: string;
};

export type MovementDetailSheet =
  | 'category'
  | 'tags'
  | 'sharing'
  | 'items'
  | 'more';

export type MovementDetailFinancialType = 'expense' | 'income' | 'transfer';

export type MovementDetailTagView = {
  id?: string;
  name: string;
};

export type MovementDetailItemView = {
  id: string;
  name: string;
  amount: string;
  currency?: string;
};

export type MovementDetailCategoryView = {
  id: string;
  name: string;
};

export type SharingParticipantView = {
  id: string;
  name: string;
  amount: string;
  reimbursementStatus?: 'pending' | 'paid' | 'dismissed';
  isCurrentUser?: boolean;
};

export type SharingViewModel = {
  participantCount: number;
  personalExpenseAmount: string;
  totalAmount: string;
  currency: string;
  participants: SharingParticipantView[];
};

export type SharingDetailState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'loaded'; value: SharingViewModel | null }
  | { phase: 'error'; message: string };

export type MovementDetailBaseViewModel = {
  id: string;
  source: 'posted' | 'scheduled' | 'expected';
  financialType: MovementDetailFinancialType;
  title: string;
  accountLabel?: string;
  dateLabel: string;
  amount: {
    value: string;
    currency: string;
    sign: '+' | '-' | '';
  };
  category?: MovementDetailCategoryView;
  items: MovementDetailItemView[];
  merchant?: string;
  note?: string;
  canOpenItems: boolean;
};

export type PostedMovementDetailViewModel = MovementDetailBaseViewModel & {
  source: 'posted';
  raw: TransactionHistoryItemView;
  status: 'posted' | 'voided';
  lifecycleChip?: never;
  tags: MovementDetailTagView[];
  ignored: boolean;
  canEditCategory: boolean;
  canEditTags: boolean;
  canToggleIgnored: boolean;
  canVoid: boolean;
  sharing: SharingDetailState;
  postedAtLabel: string;
};

export type ScheduledMovementDetailViewModel = MovementDetailBaseViewModel & {
  source: 'scheduled';
  raw: ScheduledMovementView;
  status: 'active' | 'deactivated' | 'completed';
  lifecycleChip: 'Scheduled';
  tags: MovementDetailTagView[];
  canEditCategory: boolean;
  canEditTags: boolean;
  canDeactivate: boolean;
  nextDueLabel: string;
  scheduleSummary: string;
  originLabel: string;
  targetAccountLabel?: string;
};

export type ExpectedMovementDetailViewModel = MovementDetailBaseViewModel & {
  source: 'expected';
  raw: ExpectedMovementView;
  status: 'pending' | 'resolved' | 'dismissed';
  lifecycleChip: 'Expected';
  tags: [];
  ignored: boolean;
  canEditCategory: boolean;
  canToggleIgnored: boolean;
  canEditExpected: boolean;
  canPostExpected: boolean;
  expectedAtLabel: string;
  originLabel: string;
};

export type MovementDetailViewModel =
  | PostedMovementDetailViewModel
  | ScheduledMovementDetailViewModel
  | ExpectedMovementDetailViewModel;

export type MovementDetailCategoryOption = Pick<TaxonomyCategoryItem, 'id' | 'name' | 'appliesTo' | 'usageCount'>;

export type MovementDetailTagOption = Pick<TaxonomyTagItem, 'id' | 'name'>;
