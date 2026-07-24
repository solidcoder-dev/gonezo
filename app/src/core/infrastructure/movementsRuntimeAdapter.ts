import type { CorePort } from '../application/corePort';
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
} from '../../movements/application/movements.port';
import {
  getNativeMovementsMonthOverview,
  listNativeScheduledMovements,
  searchNativeMovements,
} from '../../movements/infrastructure/nativeMovements';
import { getMovementsSearchFacets } from '../../movements/infrastructure/searchFacets';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class MovementsRuntimeAdapter {
  private readonly web: CoreAdapterWeb;
  private readonly queries: CorePort;

  constructor(web: CoreAdapterWeb, queries: CorePort) {
    this.web = web;
    this.queries = queries;
  }

  movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    return isNativeRuntime() ? getNativeMovementsMonthOverview(this.queries, input) : this.web.movementsGetMonthOverview(input);
  }

  movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    return isNativeRuntime() ? searchNativeMovements(this.queries, input) : this.web.movementsSearch(input);
  }

  movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> {
    return getMovementsSearchFacets(this.queries, input);
  }

  async movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.movementsGetMonthOverview(input);
  }

  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    return isNativeRuntime() ? listNativeScheduledMovements(this.queries, input) : this.web.movementsListScheduled(input);
  }

  movementsGetDetail(input: MovementsGetDetailInput): Promise<MovementsGetDetailResult> {
    return isNativeRuntime() ? CorePlugin.movementsGetDetail(input) : this.web.movementsGetDetail(input);
  }
}
