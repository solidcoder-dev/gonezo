create table if not exists notifications (
  sequence integer primary key autoincrement,
  id text not null unique,
  owner_id text not null,
  type text not null check (type in ('scheduled_confirmation_required', 'scheduled_processing_failed')),
  deduplication_key text not null,
  source_type text not null check (source_type in ('expected', 'scheduled')),
  source_id text not null,
  origin_occurrence_id text not null,
  subject text not null,
  error_code text null,
  occurred_at text not null,
  created_at text not null,
  read_at text null,
  withdrawn_at text null,
  unique(owner_id, deduplication_key)
);

create index if not exists idx_notifications_owner_sequence
  on notifications(owner_id, sequence);

create index if not exists idx_notifications_owner_unread_sequence
  on notifications(owner_id, read_at, withdrawn_at, sequence);

create index if not exists idx_notifications_source
  on notifications(source_type, source_id);

create table if not exists notification_deliveries (
  notification_id text primary key references notifications(id) on delete cascade,
  status text not null check (status in ('pending', 'submitted', 'suppressed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at text null,
  submitted_at text null,
  last_error_code text null
);

create index if not exists idx_notification_deliveries_status_next_attempt
  on notification_deliveries(status, next_attempt_at);
