create unique index if not exists uk_budget_reservations_period_pattern
  on budget_reservations (budget_period_id, pattern_id);
