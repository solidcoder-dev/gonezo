create table if not exists expected_movements (
  id text primary key,
  account_id text not null,
  movement_type text not null,
  amount text not null,
  currency text not null,
  expected_at text not null,
  description text,
  merchant text,
  category_id text,
  status text not null,
  resolved_transaction_id text,
  created_at text not null,
  updated_at text not null,
  resolved_at text,
  dismissed_at text
);

create index if not exists idx_expected_movements_account_status_expected
  on expected_movements(account_id, status, expected_at);

create index if not exists idx_expected_movements_resolved_transaction
  on expected_movements(resolved_transaction_id);
