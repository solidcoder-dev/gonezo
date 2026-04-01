create table if not exists taxonomy_categories (
  id text primary key,
  name text not null,
  name_normalized text not null,
  applies_to text not null,
  status text not null,
  created_at text not null,
  archived_at text null
);

create unique index if not exists uq_taxonomy_categories_name_scope
  on taxonomy_categories(name_normalized, applies_to);

create table if not exists taxonomy_transaction_assignments (
  transaction_id text primary key,
  category_id text not null references taxonomy_categories(id),
  assigned_at text not null
);

create index if not exists idx_taxonomy_assignments_category
  on taxonomy_transaction_assignments(category_id);
