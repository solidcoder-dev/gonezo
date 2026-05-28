import type {
  RecurrenceEndInput,
  RecurrenceFrequency,
  RecurrenceRuleInput,
} from '../application/scheduling.port';

export type FirstDueAtInput = {
  startAt: string;
  zoneId: string;
  rule: RecurrenceRuleInput;
  recurrenceEnd: RecurrenceEndInput;
};

export function resolveRecurrenceFrequency(rule: RecurrenceRuleInput): RecurrenceFrequency {
  const normalized = (rule.frequency ?? '').trim().toLowerCase();
  if (normalized === 'daily' || normalized === 'weekly' || normalized === 'monthly' || normalized === 'yearly') {
    return normalized;
  }
  throw new Error(`Unsupported recurrence frequency: ${rule.frequency}`);
}

export function normalizeWebRecurrenceRule(rule: RecurrenceRuleInput): RecurrenceRuleInput {
  const frequency = resolveRecurrenceFrequency(rule);
  const interval = Math.max(1, Number(rule.interval ?? 1));

  if (frequency === 'daily') {
    return { frequency, interval };
  }

  if (frequency === 'weekly') {
    const weeklyDays = [...new Set((rule.weeklyDays ?? []).map((day) => Number(day)).filter((day) => day >= 1 && day <= 7))];
    if (weeklyDays.length === 0) {
      throw new Error('Weekly recurrence requires at least one weekday');
    }
    return { frequency, interval, weeklyDays };
  }

  if (frequency === 'monthly') {
    const monthlyPattern = rule.monthlyPattern === 'nth_weekday' ? 'nth_weekday' : 'day_of_month';
    if (monthlyPattern === 'day_of_month') {
      const day = rule.dayOfMonth == null ? undefined : Number(rule.dayOfMonth);
      if (day != null && (day < 1 || day > 31)) {
        throw new Error('Monthly dayOfMonth must be between 1 and 31');
      }
      return {
        frequency,
        interval,
        monthlyPattern,
        dayOfMonth: day,
      };
    }
    const ordinal = Number(rule.monthlyWeekOrdinal ?? 1);
    const weekday = Number(rule.monthlyWeekday ?? 1);
    if (ordinal < 1 || ordinal > 5) {
      throw new Error('Monthly ordinal must be between 1 and 5');
    }
    if (weekday < 1 || weekday > 7) {
      throw new Error('Monthly weekday must be between 1 and 7');
    }
    return {
      frequency,
      interval,
      monthlyPattern,
      monthlyWeekOrdinal: ordinal,
      monthlyWeekday: weekday,
    };
  }

  return { frequency, interval };
}

export function normalizeWebRecurrenceEnd(input: RecurrenceEndInput): RecurrenceEndInput {
  if (input.kind === 'never') {
    return { kind: 'never' };
  }
  if (input.kind === 'on_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.onDate.trim())) {
      throw new Error('Recurrence end date must use YYYY-MM-DD');
    }
    return {
      kind: 'on_date',
      onDate: input.onDate.trim(),
    };
  }
  const afterOccurrences = Number(input.afterOccurrences);
  if (!Number.isFinite(afterOccurrences) || afterOccurrences <= 0) {
    throw new Error('Recurrence end count must be greater than 0');
  }
  return {
    kind: 'after_occurrences',
    afterOccurrences,
  };
}

export function firstDueAtForWebRecurrence(input: FirstDueAtInput): string | undefined {
  if (!input.zoneId.trim()) {
    throw new Error('zoneId is required');
  }
  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) {
    throw new Error('startAt must be a valid ISO datetime');
  }
  const rule = normalizeWebRecurrenceRule(input.rule);
  const end = normalizeWebRecurrenceEnd(input.recurrenceEnd);

  const anchor = new Date(start);
  const anchorHour = anchor.getHours();
  const anchorMinutes = anchor.getMinutes();
  const anchorSeconds = anchor.getSeconds();
  const anchorMs = anchor.getMilliseconds();
  let candidate = new Date(start);

  const frequency = resolveRecurrenceFrequency(rule);
  if (frequency === 'weekly') {
    const weeklyDays = [...new Set((rule.weeklyDays ?? []).map((day) => Number(day)).filter((day) => day >= 1 && day <= 7))]
      .sort((left, right) => left - right);
    const startOfWeek = new Date(anchor);
    const currentIsoDay = ((startOfWeek.getDay() + 6) % 7) + 1;
    startOfWeek.setDate(startOfWeek.getDate() - (currentIsoDay - 1));
    startOfWeek.setHours(anchorHour, anchorMinutes, anchorSeconds, anchorMs);

    let found: Date | undefined;
    for (const day of weeklyDays) {
      const maybe = new Date(startOfWeek);
      maybe.setDate(startOfWeek.getDate() + (day - 1));
      if (maybe.getTime() >= anchor.getTime()) {
        found = maybe;
        break;
      }
    }
    if (!found) {
      const cycleStart = new Date(startOfWeek);
      cycleStart.setDate(cycleStart.getDate() + (rule.interval ?? 1) * 7);
      found = new Date(cycleStart);
      found.setDate(cycleStart.getDate() + (weeklyDays[0] - 1));
    }
    candidate = found;
  }

  if (frequency === 'monthly') {
    const interval = rule.interval ?? 1;
    const monthlyPattern = rule.monthlyPattern === 'nth_weekday' ? 'nth_weekday' : 'day_of_month';
    const iterateCandidate = (year: number, monthZeroBased: number): Date => {
      if (monthlyPattern === 'nth_weekday') {
        const ordinal = Number(rule.monthlyWeekOrdinal ?? 1);
        const weekday = Number(rule.monthlyWeekday ?? 1);
        const date = nthWeekdayOfMonth(year, monthZeroBased, weekday, ordinal);
        date.setHours(anchorHour, anchorMinutes, anchorSeconds, anchorMs);
        return date;
      }
      const preferredDay = Number(rule.dayOfMonth ?? anchor.getDate());
      const monthLastDay = new Date(year, monthZeroBased + 1, 0).getDate();
      const date = new Date(year, monthZeroBased, Math.min(preferredDay, monthLastDay));
      date.setHours(anchorHour, anchorMinutes, anchorSeconds, anchorMs);
      return date;
    };

    let year = anchor.getFullYear();
    let month = anchor.getMonth();
    let maybe = iterateCandidate(year, month);
    while (maybe.getTime() < anchor.getTime()) {
      month += interval;
      year += Math.floor(month / 12);
      month %= 12;
      maybe = iterateCandidate(year, month);
    }
    candidate = maybe;
  }

  if (frequency === 'yearly') {
    candidate = new Date(anchor);
  }

  if (end.kind === 'on_date') {
    const candidateDay = candidate.toISOString().slice(0, 10);
    if (candidateDay > end.onDate) {
      return undefined;
    }
  }

  return candidate.toISOString();
}

function nthWeekdayOfMonth(year: number, monthZeroBased: number, weekdayIso: number, ordinal: number): Date {
  const firstOfMonth = new Date(year, monthZeroBased, 1);
  const jsTargetDay = weekdayIso % 7;
  const offset = (jsTargetDay - firstOfMonth.getDay() + 7) % 7;
  const firstMatch = new Date(year, monthZeroBased, 1 + offset);
  const candidate = new Date(firstMatch);
  candidate.setDate(firstMatch.getDate() + (ordinal - 1) * 7);
  if (candidate.getMonth() !== monthZeroBased) {
    candidate.setDate(candidate.getDate() - 7);
  }
  return candidate;
}
