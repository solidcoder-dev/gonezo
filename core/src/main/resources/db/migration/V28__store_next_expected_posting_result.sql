alter table expected_posting_attempts add column next_expected_movement_id text;

create index if not exists idx_expected_posting_attempts_next_expected
  on expected_posting_attempts(next_expected_movement_id);
