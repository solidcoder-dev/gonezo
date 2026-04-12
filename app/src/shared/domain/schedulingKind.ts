import type { RecurrenceEndInput } from './corePort';

export type SchedulingKind = 'one_shot' | 'recurring';

type SchedulingKindCarrier = {
  origin?: 'one_shot' | 'recurring';
  scheduleKind?: 'one_shot' | 'recurring';
  recurrenceEnd?: RecurrenceEndInput;
};

export function resolveSchedulingKind(input: SchedulingKindCarrier): SchedulingKind {
  if (input.origin === 'one_shot' || input.scheduleKind === 'one_shot') {
    return 'one_shot';
  }
  if (input.origin === 'recurring' || input.scheduleKind === 'recurring') {
    return 'recurring';
  }
  if (input.recurrenceEnd?.kind === 'after_occurrences' && input.recurrenceEnd.afterOccurrences === 1) {
    return 'one_shot';
  }
  return 'recurring';
}

