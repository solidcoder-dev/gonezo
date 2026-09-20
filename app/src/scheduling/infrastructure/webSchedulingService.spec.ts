import { describe, expect, it } from 'vitest';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import type { SchedulingLedgerPort } from '../application/schedulingLedger.port';
import type { WebRecurringMovement } from '../../core/infrastructure/webAppState';
import { WebSchedulingService } from './webSchedulingService';

describe('WebSchedulingService', () => {
  it('snapshots one-shot kind on an occurrence and keeps it after schedule edits', () => {
    const movement: WebRecurringMovement = {
      id: 'schedule-1', type: 'expense', sourceAccountId: 'account-1', amount: '10.00', currency: 'EUR',
      status: 'active', startAt: '2026-09-18T10:30:00Z', nextDueAt: '2026-09-18T10:30:00Z', zoneId: 'UTC',
      reviewPolicy: 'require_user_confirmation', generatedOccurrences: 0, splitItems: [],
      rule: { frequency: 'daily' }, recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 1 },
      scheduleKind: 'one_shot', origin: 'one_shot', createdAt: '2026-09-01T00:00:00Z',
    };
    const state = createWebAppState({ recurringMovements: [movement] });
    const dependencies: WebRuntimeDependencies = {
      clock: { nowIso: () => '2026-09-18T10:30:00Z' },
      idGenerator: { nextId: () => 'occurrence-1' },
      backupDownloader: { downloadJson: () => undefined },
    };
    const service = new WebSchedulingService({ state, dependencies, ledger: {} as SchedulingLedgerPort });

    service.projectNextConfirmationRequiredOccurrence('schedule-1');
    movement.scheduleKind = 'recurring';
    movement.origin = 'recurring';

    expect(state.recurringMovementOccurrences).toEqual([{
      id: 'occurrence-1', recurringMovementId: 'schedule-1', dueAt: '2026-09-18T10:30:00Z', schedulingKind: 'one_shot',
    }]);
  });
});
