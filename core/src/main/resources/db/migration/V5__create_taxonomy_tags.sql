create table if not exists taxonomy_tags (
  id text primary key,
  name text not null,
  name_normalized text not null,
  status text not null,
  created_at text not null,
  archived_at text null
);

create unique index if not exists uq_taxonomy_tags_name
  on taxonomy_tags(name_normalized);

create table if not exists taxonomy_transaction_tag_assignments (
  transaction_id text not null,
  tag_id text not null references taxonomy_tags(id),
  assigned_at text not null,
  primary key(transaction_id, tag_id)
);

create index if not exists idx_taxonomy_transaction_tags_tx
  on taxonomy_transaction_tag_assignments(transaction_id);

create index if not exists idx_taxonomy_transaction_tags_tag
  on taxonomy_transaction_tag_assignments(tag_id);
