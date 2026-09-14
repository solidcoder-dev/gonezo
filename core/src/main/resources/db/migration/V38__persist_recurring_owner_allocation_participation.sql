alter table sharing_recurring_plans add column owner_included integer not null default 1;
alter table sharing_planned_expense_shares add column owner_included integer not null default 1;
