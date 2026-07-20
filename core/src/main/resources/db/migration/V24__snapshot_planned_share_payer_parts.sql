alter table sharing_planned_expense_shares add column payer_parts integer;

update sharing_planned_expense_shares
set payer_parts = (
  select payer_parts
  from sharing_recurring_plans
  where sharing_recurring_plans.id = sharing_planned_expense_shares.source_plan_id
)
where payer_parts is null;

create unique index if not exists uq_sharing_expense_shares_source_transaction
  on sharing_expense_shares(source_transaction_id);
