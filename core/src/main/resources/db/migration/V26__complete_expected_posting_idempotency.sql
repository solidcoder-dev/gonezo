alter table expected_posting_attempts
  add column completion_status text not null default 'completed';

create unique index if not exists uq_expected_posting_attempts_expected_success
  on expected_posting_attempts(expected_movement_id, completion_status)
  where completion_status = 'completed';
