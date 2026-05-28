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
} from '../application/movements.port';
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
