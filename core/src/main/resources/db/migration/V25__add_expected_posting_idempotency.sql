create table if not exists expected_posting_attempts (
  idempotency_key text primary key,
  expected_movement_id text not null unique,
  transaction_id text not null,
  share_id text,
  completed_at text not null,
  foreign key(expected_movement_id) references expected_movements(id),
  foreign key(transaction_id) references ledger_transactions(id)
);
