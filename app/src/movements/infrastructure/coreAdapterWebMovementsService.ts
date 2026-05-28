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
} from '../application/movementsCore.port';
import type {
  MovementsExpectedReader,
  MovementsLedgerReader,
  MovementsSchedulingReader,
  MovementsTaxonomyReader,
} from '../application/movementsReaderPorts';
import { WebMovementsFacetsService } from './coreAdapterWebMovementsFacetsService';
import { WebMovementsOverviewService } from './coreAdapterWebMovementsOverviewService';
import { WebMovementsSearchService } from './coreAdapterWebMovementsSearchService';
import { WebScheduledMovementsListService } from './coreAdapterWebScheduledMovementsListService';
import type { WebCoreState } from '../../core/infrastructure/coreAdapterWebState';

export type WebMovementsServiceOptions = {
  state: WebCoreState;
  ledger: MovementsLedgerReader;
  taxonomy: MovementsTaxonomyReader;
  scheduling: MovementsSchedulingReader;
  expected: MovementsExpectedReader;
};

export class WebMovementsService {
  private readonly overviewService: WebMovementsOverviewService;

  private readonly searchService: WebMovementsSearchService;

  private readonly facetsService: WebMovementsFacetsService;

  private readonly scheduledListService: WebScheduledMovementsListService;

  constructor(options: WebMovementsServiceOptions) {
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
}
