export type RecurrenceFrequencyView = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceMonthlyPatternView = 'day_of_month' | 'nth_weekday';

export type RecurrenceRuleView = {
  frequency: RecurrenceFrequencyView;
  interval?: number;
  weeklyDays?: number[];
  monthlyPattern?: RecurrenceMonthlyPatternView;
  dayOfMonth?: number;
  monthlyWeekOrdinal?: number;
  monthlyWeekday?: number;
};

export type RecurrenceEndView =
  | {
    kind: 'never';
  }
  | {
    kind: 'on_date';
    onDate: string;
  }
  | {
    kind: 'after_occurrences';
    afterOccurrences: number;
  };
