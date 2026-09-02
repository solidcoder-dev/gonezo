insert into analytics_exclusions_legacy_archive (id, scope_type, scope_id, reason, created_at)
select legacy.id, legacy.scope_type, legacy.scope_id, legacy.reason, legacy.created_at
from analytics_exclusions legacy
where legacy.reason = 'shared_expense_lent_amount'
  and not exists (
    select 1
    from analytics_exclusions_legacy_archive archived
    where archived.id = legacy.id
  );

delete from analytics_exclusions
where reason = 'shared_expense_lent_amount'
  and exists (
    select 1
    from analytics_exclusions canonical
    where canonical.scope_type = analytics_exclusions.scope_type
      and canonical.scope_id = analytics_exclusions.scope_id
      and canonical.reason = 'shared_expense'
  );

update analytics_exclusions
set reason = 'shared_expense'
where reason = 'shared_expense_lent_amount';
