create index if not exists idx_recurring_occurrences_ledger_transaction
  on recurring_movement_occurrences(ledger_transaction_id)
  where ledger_transaction_id is not null;
