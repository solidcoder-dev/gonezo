create table if not exists sharing_recurring_plans (
  id text primary key,
  recurring_movement_ref text not null,
  payer_person_id text not null,
  mode text not null check (mode in ('parts', 'amounts')),
  currency text not null,
  payer_parts integer,
  created_at text not null,
  updated_at text not null,
  foreign key(payer_person_id) references sharing_persons(id),
  check ((mode = 'parts' and payer_parts is not null and payer_parts > 0) or
         (mode = 'amounts' and payer_parts is null))
);

create unique index if not exists uq_sharing_recurring_plans_movement
  on sharing_recurring_plans(recurring_movement_ref);

create index if not exists idx_sharing_recurring_plans_payer
  on sharing_recurring_plans(payer_person_id);

create table if not exists sharing_recurring_plan_participants (
  id text primary key,
  plan_id text not null,
  person_id text not null,
  participant_parts integer,
  fixed_amount text,
  reimbursable integer not null check (reimbursable in (0, 1)),
  participant_order integer not null,
  foreign key(plan_id) references sharing_recurring_plans(id) on delete cascade,
  foreign key(person_id) references sharing_persons(id),
  check ((participant_parts is not null and participant_parts > 0 and fixed_amount is null) or
         (participant_parts is null and fixed_amount is not null and cast(fixed_amount as real) > 0))
);

create unique index if not exists uq_sharing_recurring_plan_participant_person
  on sharing_recurring_plan_participants(plan_id, person_id);

create unique index if not exists uq_sharing_recurring_plan_participant_order
  on sharing_recurring_plan_participants(plan_id, participant_order);

create index if not exists idx_sharing_recurring_plan_participants_plan
  on sharing_recurring_plan_participants(plan_id, participant_order);

create table if not exists sharing_planned_expense_shares (
  id text primary key,
  expected_movement_ref text not null,
  source_plan_id text not null,
  payer_person_id text not null,
  mode text not null check (mode in ('parts', 'amounts')),
  total_amount text not null,
  currency text not null,
  status text not null check (status in ('pending', 'materialized', 'cancelled')),
  materialized_transaction_ref text,
  materialized_share_ref text,
  created_at text not null,
  updated_at text not null,
  foreign key(source_plan_id) references sharing_recurring_plans(id),
  foreign key(payer_person_id) references sharing_persons(id),
  check ((status = 'materialized' and materialized_transaction_ref is not null and materialized_share_ref is not null) or
         (status <> 'materialized' and materialized_transaction_ref is null and materialized_share_ref is null))
);

create unique index if not exists uq_sharing_planned_expense_expected
  on sharing_planned_expense_shares(expected_movement_ref);

create unique index if not exists uq_sharing_planned_expense_transaction
  on sharing_planned_expense_shares(materialized_transaction_ref)
  where materialized_transaction_ref is not null;

create index if not exists idx_sharing_planned_expense_plan
  on sharing_planned_expense_shares(source_plan_id);

create index if not exists idx_sharing_planned_expense_status
  on sharing_planned_expense_shares(status, expected_movement_ref);

create table if not exists sharing_planned_expense_share_participants (
  id text primary key,
  planned_share_id text not null,
  person_id text not null,
  participant_parts integer,
  amount text not null,
  reimbursable integer not null check (reimbursable in (0, 1)),
  participant_order integer not null,
  foreign key(planned_share_id) references sharing_planned_expense_shares(id) on delete cascade,
  foreign key(person_id) references sharing_persons(id)
);

create unique index if not exists uq_sharing_planned_share_participant_person
  on sharing_planned_expense_share_participants(planned_share_id, person_id);

create unique index if not exists uq_sharing_planned_share_participant_order
  on sharing_planned_expense_share_participants(planned_share_id, participant_order);

create index if not exists idx_sharing_planned_share_participants_share
  on sharing_planned_expense_share_participants(planned_share_id, participant_order);
