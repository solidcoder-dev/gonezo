import type { MovementsGetDetailInput, MovementsGetDetailResult } from '../application/movements.port';
import { mapWebLedgerTransactionDetail } from '../../ledger/application/ledgerTransactionDetail';
import type {
  MovementsExpectedReader,
  MovementsSchedulingReader,
} from '../application/movementsReaderPorts';
import type { WebAppState } from '../../core/infrastructure/webAppState';

export type WebMovementsDetailServiceOptions = {
  state: WebAppState;
  expected: MovementsExpectedReader;
  scheduling: MovementsSchedulingReader;
};

type LedgerDetailState = {
  ledgerAccounts: WebAppState['ledgerAccounts'];
  taxonomyCategories: WebAppState['taxonomyCategories'];
  taxonomyTags: WebAppState['taxonomyTags'];
  analyticsExclusions: Array<{
    scopeType: 'movement';
    scopeId: string;
    reason: 'user_ignored';
  }>;
};

export class WebMovementsDetailService {
  private readonly options: WebMovementsDetailServiceOptions;

  constructor(options: WebMovementsDetailServiceOptions) {
    this.options = options;
  }

  private ledgerDetailState(): LedgerDetailState {
    return {
      ledgerAccounts: this.options.state.ledgerAccounts,
      taxonomyCategories: this.options.state.taxonomyCategories,
      taxonomyTags: this.options.state.taxonomyTags,
      analyticsExclusions: this.options.state.analyticsExclusions
        .filter((item) => item.scopeType === 'movement' && item.reason === 'user_ignored')
        .map((item) => ({
          scopeType: 'movement' as const,
          scopeId: item.scopeId,
          reason: 'user_ignored' as const,
        })),
    };
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
      const transaction = this.options.state.ledgerTransactions.find((item) => item.id === movementId);
      if (!transaction) return { found: false };
      const detail = mapWebLedgerTransactionDetail(
        transaction,
        this.ledgerDetailState(),
        this.options.state.taxonomyTransactionTags,
      );
      return { found: true, detail: { source: 'posted', movement: detail } };
    }
    if (input.source === 'scheduled') {
      const movement = this.options.state.recurringMovements.find((item) => item.id === movementId);
      return movement
        ? { found: true, detail: { source: 'scheduled', movement: { ...movement, splitItems: movement.splitItems.map((item) => ({ ...item })) } } }
        : { found: false };
    }
    const movement = this.options.state.expectedMovements.find((item) => item.id === movementId);
    if (!movement) return { found: false };
    const occurrenceId = movement.originOccurrenceId?.trim();
    const recurringMovementId = movement.originRecurringMovementId?.trim()
      || (occurrenceId ? this.options.state.recurringMovementOccurrences.find((occurrence) => occurrence.id === occurrenceId)?.recurringMovementId : undefined);
    const series = recurringMovementId
      ? this.options.state.recurringMovements.find((item) => item.id === recurringMovementId) ?? null
      : null;
    const expected = {
      ...movement,
      ignored: this.options.state.analyticsExclusions.some((item) => item.scopeType === 'expected_movement' && item.scopeId === movement.id && item.reason === 'user_ignored'),
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
