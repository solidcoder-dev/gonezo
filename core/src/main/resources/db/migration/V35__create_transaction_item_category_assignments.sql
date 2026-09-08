create table if not exists taxonomy_transaction_item_category_assignments (
  transaction_item_id text primary key,
  category_id text not null references taxonomy_categories(id),
  assigned_at text not null
);

create index if not exists idx_taxonomy_transaction_item_categories_category
  on taxonomy_transaction_item_category_assignments(category_id);

insert into taxonomy_transaction_item_category_assignments (transaction_item_id, category_id, assigned_at)
select items.id, items.category_id, '1970-01-01T00:00:00Z'
from ledger_transaction_items items
where items.category_id is not null
  and exists (select 1 from taxonomy_categories categories where categories.id = items.category_id)
  and not exists (select 1 from taxonomy_transaction_item_category_assignments assignments where assignments.transaction_item_id = items.id);
