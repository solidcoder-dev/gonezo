create table if not exists taxonomy_transaction_item_category_assignments (
  transaction_item_id text primary key,
  category_id text not null references taxonomy_categories(id),
  assigned_at text not null
);

create index if not exists idx_taxonomy_transaction_item_categories_category
  on taxonomy_transaction_item_category_assignments(category_id);
