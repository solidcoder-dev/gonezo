create table if not exists recurring_movements (
  id text primary key,
  movement_type text not null,
  source_account_id text not null,
  target_account_id text,
  amount text not null,
  currency text not null,
  destination_amount text,
  destination_currency text,
  exchange_rate text,
  description text,
  merchant text,
  rule_frequency text not null,
  rule_interval integer not null,
  rule_weekdays text,
  rule_day_of_month integer,
  rule_monthly_pattern text not null,
  rule_monthly_nth integer,
  rule_monthly_weekday text,
  end_kind text not null,
  end_on_date text,
  end_after_occurrences integer,
  start_at text not null,
  zone_id text not null,
  next_due_at text,
  status text not null,
  generated_occurrences integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deactivated_at text,
  completed_at text
);

create index if not exists idx_recurring_movements_due
  on recurring_movements(status, next_due_at);

create index if not exists idx_recurring_movements_account
  on recurring_movements(source_account_id, status);

create table if not exists recurring_movement_occurrences (
  id text primary key,
  recurring_movement_id text not null,
  due_at text not null,
  status text not null,
  ledger_transaction_id text,
  error_code text,
  error_message text,
  created_at text not null,
  updated_at text not null,
  acknowledged_at text,
  foreign key(recurring_movement_id) references recurring_movements(id)
);

create unique index if not exists uq_recurring_occurrence_due
  on recurring_movement_occurrences(recurring_movement_id, due_at);

create index if not exists idx_recurring_occurrences_status
  on recurring_movement_occurrences(status, due_at);

create table if not exists recurrence_outbox (
  id text primary key,
  aggregate_id text not null,
  occurrence_id text,
  event_type text not null,
  payload_json text not null,
  status text not null,
  attempts integer not null default 0,
  last_error text,
  created_at text not null,
  published_at text
);

create index if not exists idx_recurrence_outbox_status
  on recurrence_outbox(status, created_at);
