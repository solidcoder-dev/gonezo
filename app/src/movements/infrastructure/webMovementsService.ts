import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsGetDetailInput,
  MovementsGetDetailResult,
} from '../application/movements.port';
import { mapWebLedgerTransactionDetail } from '../../ledger/infrastructure/webLedgerQueries';
import type {
  MovementsExpectedReader,
  MovementsLedgerReader,
  MovementsSchedulingReader,
  MovementsTaxonomyReader,
} from '../application/movementsReaderPorts';
import { WebMovementsFacetsService } from './webMovementsFacetsService';
import { WebMovementsOverviewService } from './webMovementsOverviewService';
import { WebMovementsSearchService } from './webMovementsSearchService';
import { WebScheduledMovementsListService } from './webScheduledMovementsListService';
import type { WebAppState } from '../../core/infrastructure/webAppState';

export type WebMovementsServiceOptions = {
  state: WebAppState;
  ledger: MovementsLedgerReader;
  taxonomy: MovementsTaxonomyReader;
  scheduling: MovementsSchedulingReader;
  expected: MovementsExpectedReader;
};

export class WebMovementsService {
  private readonly state: WebAppState;
  private readonly overviewService: WebMovementsOverviewService;

  private readonly searchService: WebMovementsSearchService;

  private readonly facetsService: WebMovementsFacetsService;

  private readonly scheduledListService: WebScheduledMovementsListService;

  constructor(options: WebMovementsServiceOptions) {
    this.state = options.state;
    this.scheduledListService = new WebScheduledMovementsListService({
      state: options.state,
    });
    this.overviewService = new WebMovementsOverviewService({
      state: options.state,
      ledger: options.ledger,
    });
    this.searchService = new WebMovementsSearchService({
      state: options.state,
      ledger: options.ledger,
      taxonomy: options.taxonomy,
      scheduledList: this.scheduledListService,
    });
    this.facetsService = new WebMovementsFacetsService({
      ledger: options.ledger,
      taxonomy: options.taxonomy,
      scheduling: options.scheduling,
      expected: options.expected,
    });
  }

  async getMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    return this.overviewService.getMonthOverview(input);
  }

  async getOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.overviewService.getOverview(input);
  }

  async search(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    return this.searchService.search(input);
  }

  async getSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> {
    return this.facetsService.getSearchFacets(input);
  }

  async listScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    return this.scheduledListService.listScheduled(input);
  }

  async getDetail(input: MovementsGetDetailInput): Promise<MovementsGetDetailResult> {
    const movementId = input.movementId.trim();
    if (!movementId) {
      throw new Error('movementId is required');
    }
    if (input.source !== 'posted' && input.source !== 'scheduled' && input.source !== 'expected') {
      throw new Error('source is invalid');
    }
    if (input.source === 'posted') {
      const transaction = this.state.ledgerTransactions.find((item) => item.id === movementId);
      if (!transaction) return { found: false };
      const detail = mapWebLedgerTransactionDetail(
        transaction,
        this.state,
        this.state.taxonomyTransactionTags,
      );
      return { found: true, detail: { source: 'posted', movement: detail } };
    }
    if (input.source === 'scheduled') {
      const movement = this.state.recurringMovements.find((item) => item.id === movementId);
      return movement
        ? { found: true, detail: { source: 'scheduled', movement: { ...movement, splitItems: movement.splitItems.map((item) => ({ ...item })) } } }
        : { found: false };
    }
    const movement = this.state.expectedMovements.find((item) => item.id === movementId);
    if (!movement) return { found: false };
    const occurrenceId = movement.originOccurrenceId?.trim();
    const recurringMovementId = movement.originRecurringMovementId?.trim()
      || (occurrenceId ? this.state.recurringMovementOccurrences.find((occurrence) => occurrence.id === occurrenceId)?.recurringMovementId : undefined);
    const series = recurringMovementId
      ? this.state.recurringMovements.find((item) => item.id === recurringMovementId) ?? null
      : undefined;
    const expected = {
      ...movement,
      ignored: this.state.analyticsExclusions.some((item) => item.scopeType === 'expected_movement' && item.scopeId === movement.id && item.reason === 'user_ignored'),
      splitItems: movement.splitItems.map((item) => ({ ...item })),
    };
    const origin = recurringMovementId
      ? { kind: 'recurring' as const, recurringMovementId, occurrenceId, series: series ? { ...series, splitItems: series.splitItems.map((item) => ({ ...item })) } : null }
      : occurrenceId
        ? { kind: 'recurring_unlinked' as const, occurrenceId }
        : { kind: 'manual' as const };
    return { found: true, detail: { source: 'expected', movement: expected, origin } };
  }
}
