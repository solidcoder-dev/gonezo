create table if not exists analytics_exclusions_legacy_archive (
  id text primary key,
  scope_type text not null,
  scope_id text not null,
  reason text not null,
  created_at text not null
);

insert into analytics_exclusions_legacy_archive (id, scope_type, scope_id, reason, created_at)
select legacy.id, legacy.scope_type, legacy.scope_id, legacy.reason, legacy.created_at
from analytics_exclusions legacy
where legacy.reason in ('shared-expense_lent_amount', 'shared_expense_reimbursement')
  and exists (
    select 1
    from analytics_exclusions canonical
    where canonical.scope_type = legacy.scope_type
      and canonical.scope_id = legacy.scope_id
      and canonical.reason = case legacy.reason
        when 'shared-expense_lent_amount' then 'shared_expense'
        when 'shared_expense_reimbursement' then 'reimbursement'
      end
  );

delete from analytics_exclusions
where reason in ('shared-expense_lent_amount', 'shared_expense_reimbursement')
  and exists (
    select 1
    from analytics_exclusions canonical
    where canonical.scope_type = analytics_exclusions.scope_type
      and canonical.scope_id = analytics_exclusions.scope_id
      and canonical.reason = case analytics_exclusions.reason
        when 'shared-expense_lent_amount' then 'shared_expense'
        when 'shared_expense_reimbursement' then 'reimbursement'
        end
  );

update analytics_exclusions
set reason = 'shared_expense'
where reason = 'shared-expense_lent_amount';

update analytics_exclusions
set reason = 'reimbursement'
where reason = 'shared_expense_reimbursement';
