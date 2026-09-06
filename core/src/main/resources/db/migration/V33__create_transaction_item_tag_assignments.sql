create table if not exists taxonomy_transaction_item_tag_assignments (
  transaction_item_id text not null,
  tag_id text not null references taxonomy_tags(id),
  assigned_at text not null,
  primary key(transaction_item_id, tag_id)
);

create index if not exists idx_taxonomy_transaction_item_tags_item
  on taxonomy_transaction_item_tag_assignments(transaction_item_id);

create index if not exists idx_taxonomy_transaction_item_tags_tag
  on taxonomy_transaction_item_tag_assignments(tag_id);
