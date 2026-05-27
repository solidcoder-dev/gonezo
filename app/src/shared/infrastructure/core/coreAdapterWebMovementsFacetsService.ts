import type {
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
} from '../../domain/corePort';
import type { WebExpectedMovementsService } from './coreAdapterWebExpectedService';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import type { WebSchedulingService } from './coreAdapterWebSchedulingService';
import type { WebSearchFacetsTaxonomyPort } from './coreAdapterWebTaxonomyService';
import { getMovementsSearchFacets } from './movementsSearchFacets';

export type WebMovementsFacetsServiceOptions = {
  ledger: WebLedgerService;
  taxonomy: WebSearchFacetsTaxonomyPort;
  scheduling: WebSchedulingService;
  expected: WebExpectedMovementsService;
};

export class WebMovementsFacetsService {
  private readonly ledger: WebLedgerService;

  private readonly taxonomy: WebSearchFacetsTaxonomyPort;

  private readonly scheduling: WebSchedulingService;

  private readonly expected: WebExpectedMovementsService;

  constructor(options: WebMovementsFacetsServiceOptions) {
    this.ledger = options.ledger;
    this.taxonomy = options.taxonomy;
    this.scheduling = options.scheduling;
    this.expected = options.expected;
  }

  async getSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> {
    return getMovementsSearchFacets({
      ledgerListTransactions: (request) => this.ledger.listTransactions(request),
      orchestrationListTransactionTaxonomy: (request) => this.taxonomy.listTransactionTaxonomy(request),
      taxonomyListCategories: (request) => this.taxonomy.listCategories(request),
      taxonomyListTags: (request) => this.taxonomy.listTags(request),
      schedulingListMovements: (request) => this.scheduling.listMovements(request),
      expectedListMovements: (request) => this.expected.listMovements(request),
    }, input);
  }
}
