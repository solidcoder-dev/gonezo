alter table recurring_movement_occurrences
  add column recurrence_frequency text null
  check (recurrence_frequency is null or recurrence_frequency in ('daily', 'weekly', 'monthly', 'yearly'));

alter table recurring_movement_occurrences
  add column recurrence_interval integer null
  check (recurrence_interval is null or recurrence_interval >= 1);
