create table if not exists sharing_persons (
  id text primary key,
  display_name text not null,
  normalized_name text not null,
  created_at text not null,
  archived_at text
);

create unique index if not exists uq_sharing_persons_normalized_active
  on sharing_persons(normalized_name)
  where archived_at is null;

create table if not exists sharing_expense_shares (
  id text primary key,
  source_transaction_id text not null,
  payer_person_id text not null,
  total_amount text not null,
  currency text not null,
  created_at text not null,
  updated_at text not null,
  foreign key(source_transaction_id) references ledger_transactions(id) on delete cascade,
  foreign key(payer_person_id) references sharing_persons(id)
);

create unique index if not exists uq_sharing_expense_shares_source_transaction
  on sharing_expense_shares(source_transaction_id);

create table if not exists sharing_expense_share_participants (
  id text primary key,
  share_id text not null,
  person_id text not null,
  amount text not null,
  reimbursable integer not null,
  expected_movement_id text,
  foreign key(share_id) references sharing_expense_shares(id) on delete cascade,
  foreign key(person_id) references sharing_persons(id),
  foreign key(expected_movement_id) references expected_movements(id)
);

create unique index if not exists uq_sharing_share_participants_person
  on sharing_expense_share_participants(share_id, person_id);

create index if not exists idx_sharing_share_participants_expected
  on sharing_expense_share_participants(expected_movement_id)
  where expected_movement_id is not null;

create table if not exists analytics_exclusions (
  id text primary key,
  scope_type text not null,
  scope_id text not null,
  reason text not null,
  created_at text not null
);

create unique index if not exists uq_analytics_exclusions_scope_reason
  on analytics_exclusions(scope_type, scope_id, reason);
