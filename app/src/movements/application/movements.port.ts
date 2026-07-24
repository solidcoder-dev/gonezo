import type {
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
  LedgerPageRequestInput,
  LedgerSortDirection,
  LedgerTransactionSortInput,
  LedgerTransactionType,
} from '../../ledger/application/ledger.port';
import type { ExpectedMovementItem } from '../../expected/application/expected.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/application/taxonomy.port';

export type MovementsMonthOverviewInput = {
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  postedPagination?: LedgerPageRequestInput;
  executedPagination?: LedgerPageRequestInput;
  scheduledPreviewSize?: number;
  expectedPreviewSize?: number;
  filters?: MovementsSearchFiltersInput;
  sort?: LedgerTransactionSortInput[];
};

export type MovementsMonthOverviewResult = {
  scheduledPreview: {
    items: SchedulingMovementItem[];
    total: number;
    hasMore: boolean;
  };
  expectedPreview: {
    items: ExpectedMovementItem[];
    total: number;
    hasMore: boolean;
  };
  postedPage: LedgerListTransactionsResult;
  executedPage: LedgerListTransactionsResult;
};

export type MovementsSearchSource = 'posted' | 'scheduled' | 'expected';

export type MovementsGetDetailInput = {
  source: MovementsSearchSource;
  movementId: string;
};

export type PostedMovementDetailData = {
  source: 'posted';
  movement: LedgerTransactionListItem;
};

export type ScheduledMovementDetailData = {
  source: 'scheduled';
  movement: SchedulingMovementItem;
};

export type ExpectedMovementDetailOrigin =
  | { kind: 'manual' }
  | {
      kind: 'recurring';
      recurringMovementId: string;
      occurrenceId?: string;
      series: SchedulingMovementItem | null;
    }
  | {
      kind: 'recurring_unlinked';
      occurrenceId: string;
    };

export type ExpectedMovementDetailData = {
  source: 'expected';
  movement: ExpectedMovementItem;
  origin: ExpectedMovementDetailOrigin;
};

export type MovementsDetailData =
  | PostedMovementDetailData
  | ScheduledMovementDetailData
  | ExpectedMovementDetailData;

export type MovementsGetDetailResult =
  | { found: false }
  | { found: true; detail: MovementsDetailData };

export type MovementsSearchFiltersInput = {
  text?: string;
  merchant?: string;
  categoryId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  amountMin?: string;
  amountMax?: string;
  fromDate?: string;
  toDate?: string;
  types?: LedgerTransactionType[];
  status?: 'all' | 'scheduled' | 'executed' | 'voided' | 'failed';
  origin?: 'all' | 'recurring' | 'one_shot' | 'manual';
};

export type MovementsSearchSortField = 'date' | 'amount';

export type MovementsSearchSortInput = {
  field: MovementsSearchSortField;
  direction: LedgerSortDirection;
};

export type MovementsSearchItem = {
  id: string;
  source: MovementsSearchSource;
  type: LedgerTransactionType;
  status: 'posted' | 'scheduled' | 'expected' | 'resolved' | 'dismissed' | 'voided' | 'failed' | 'deactivated';
  amount: string;
  currency: string;
  occurredAt: string;
  title: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  ignored?: boolean;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  items?: Array<{
    id: string;
    name: string;
    amount: string;
  }>;
};

export type MovementsSearchInput = {
  accountId: string;
  source: MovementsSearchSource;
  filters?: MovementsSearchFiltersInput;
  pagination?: LedgerPageRequestInput;
  sort?: MovementsSearchSortInput[];
};

export type MovementsSearchResult = {
  content: MovementsSearchItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type MovementsSearchFacetsInput = {
  accountIds: string[];
};

export type MovementsSearchFacetCategory = {
  id: string;
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
};

export type MovementsSearchFacetTag = {
  id: string;
  name: string;
};

export type MovementsSearchFacetsResult = {
  categories: MovementsSearchFacetCategory[];
  tags: MovementsSearchFacetTag[];
};

export type MovementsOverviewFilterInput = MovementsSearchFiltersInput;
export type MovementsGetOverviewInput = MovementsMonthOverviewInput;
export type MovementsGetOverviewResult = MovementsMonthOverviewResult;

export type MovementsListScheduledInput = {
  accountId: string;
  filters?: MovementsOverviewFilterInput;
  pagination?: LedgerPageRequestInput;
  sort?: Array<{
    field: 'nextDueAt' | 'amount';
    direction: LedgerSortDirection;
  }>;
};

export type MovementsListScheduledResult = {
  content: SchedulingMovementItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export interface MovementsQueryPort {
  movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult>;
  movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult>;
  movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult>;
  movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult>;
  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
  movementsGetDetail(input: MovementsGetDetailInput): Promise<MovementsGetDetailResult>;
}

export type MovementDetailQueryPort = Pick<MovementsQueryPort, 'movementsGetDetail'>;
