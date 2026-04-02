insert into taxonomy_transaction_assignments (transaction_id, category_id, assigned_at)
select
  t.id as transaction_id,
  t.category_id as category_id,
  t.occurred_at as assigned_at
from ledger_transactions t
where t.category_id is not null
  and exists (
    select 1
    from taxonomy_categories c
    where c.id = t.category_id
  )
  and not exists (
    select 1
    from taxonomy_transaction_assignments a
    where a.transaction_id = t.id
  );
