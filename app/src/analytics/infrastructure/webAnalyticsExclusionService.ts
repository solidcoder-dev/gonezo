import type {
  AnalyticsListIgnoredMovementsResult,
  AnalyticsSetMovementIgnoredInput,
} from '../application/analytics.port';
import type { LedgerListTransactionsResult } from '../../ledger/application/ledger.port';
import type { WebAppState } from '../../core/infrastructure/webAppState';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';

function isIgnoredMovementExclusion(item: WebAppState['analyticsExclusions'][number]): boolean {
  return item.scopeType === 'movement' && item.reason === 'user_ignored';
}

export class WebAnalyticsExclusionService {
  private readonly state: WebAppState;

  private readonly dependencies: WebRuntimeDependencies;

  constructor(
    state: WebAppState,
    dependencies: WebRuntimeDependencies,
  ) {
    this.state = state;
    this.dependencies = dependencies;
  }

  setMovementIgnored(input: AnalyticsSetMovementIgnoredInput): void {
    if (input.source === 'scheduledProjection') {
      throw new Error('scheduled projections cannot be ignored individually');
    }
    const scopeType = input.source === 'posted' ? 'movement' : 'expected_movement';
    const scopeId = input.source === 'posted' ? input.transactionId.trim() : input.expectedMovementId.trim();
    if (!scopeId) throw new Error('analytics movement reference id is required');

    this.state.analyticsExclusions = this.state.analyticsExclusions.filter((item) => !(
      item.scopeType === scopeType && item.reason === 'user_ignored' && item.scopeId === scopeId
    ));

    if (input.ignored) {
      this.state.analyticsExclusions.push({
        id: this.dependencies.idGenerator.nextId(),
        scopeType,
        scopeId,
        reason: 'user_ignored',
        createdAt: input.changedAt ?? this.dependencies.clock.nowIso(),
      });
    }
  }

  listIgnoredMovements(): AnalyticsListIgnoredMovementsResult {
    return {
      movementIds: [...new Set(
        this.state.analyticsExclusions
          .filter(isIgnoredMovementExclusion)
          .map((item) => item.scopeId),
      )],
    };
  }

  applyIgnoredMovements(result: LedgerListTransactionsResult): LedgerListTransactionsResult {
    const ignoredMovementIds = new Set(this.listIgnoredMovements().movementIds);
    return {
      ...result,
      content: result.content.map((item) => ({
        ...item,
        ignored: ignoredMovementIds.has(item.id),
      })),
    };
  }
}
