import type {
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
} from '../application/movements.port';
import type {
  MovementsExpectedReader,
  MovementsLedgerReader,
  MovementsSchedulingReader,
  MovementsTaxonomyReader,
} from '../application/movementsReaderPorts';
import { getMovementsSearchFacets } from './searchFacets';

export type WebMovementsFacetsServiceOptions = {
  ledger: MovementsLedgerReader;
  taxonomy: MovementsTaxonomyReader;
  scheduling: MovementsSchedulingReader;
  expected: MovementsExpectedReader;
};

export class WebMovementsFacetsService {
  private readonly ledger: MovementsLedgerReader;

  private readonly taxonomy: MovementsTaxonomyReader;

  private readonly scheduling: MovementsSchedulingReader;

  private readonly expected: MovementsExpectedReader;

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
