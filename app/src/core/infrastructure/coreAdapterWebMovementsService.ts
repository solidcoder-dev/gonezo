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
} from '../../movements/application/movementsCore.port';
import type { WebExpectedMovementsService } from './coreAdapterWebExpectedService';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import { WebMovementsFacetsService } from './coreAdapterWebMovementsFacetsService';
import { WebMovementsOverviewService } from './coreAdapterWebMovementsOverviewService';
import { WebMovementsSearchService } from './coreAdapterWebMovementsSearchService';
import type { WebSchedulingService } from './coreAdapterWebSchedulingService';
import { WebScheduledMovementsListService } from './coreAdapterWebScheduledMovementsListService';
import type { WebCoreState } from './coreAdapterWebState';
import type {
  WebMovementsTaxonomyPort,
  WebSearchFacetsTaxonomyPort,
} from './coreAdapterWebTaxonomyService';

type WebMovementsServiceTaxonomyPort = WebMovementsTaxonomyPort & WebSearchFacetsTaxonomyPort;

export type WebMovementsServiceOptions = {
  state: WebCoreState;
  ledger: WebLedgerService;
  taxonomy: WebMovementsServiceTaxonomyPort;
  scheduling: WebSchedulingService;
  expected: WebExpectedMovementsService;
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
