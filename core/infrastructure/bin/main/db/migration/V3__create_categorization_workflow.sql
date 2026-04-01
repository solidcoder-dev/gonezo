create table if not exists workflow_tx_categorization (
  transaction_id text primary key,
  requested_category_id text null,
  status text not null,
  error_code text null,
  error_message text null,
  attempts integer not null,
  next_attempt_at text null,
  updated_at text not null,
  created_at text not null
);

create index if not exists idx_workflow_tx_categorization_status_next_attempt
  on workflow_tx_categorization(status, next_attempt_at);
