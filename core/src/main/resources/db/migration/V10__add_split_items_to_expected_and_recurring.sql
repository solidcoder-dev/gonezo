create table if not exists expected_movement_items (
  id text primary key,
  expected_movement_id text not null,
  item_order integer not null,
  name text not null,
  amount text not null,
  foreign key(expected_movement_id) references expected_movements(id) on delete cascade
);

create unique index if not exists uq_expected_movement_items_order
  on expected_movement_items(expected_movement_id, item_order);

create index if not exists idx_expected_movement_items_expected
  on expected_movement_items(expected_movement_id);

create table if not exists recurring_movement_items (
  id text primary key,
  recurring_movement_id text not null,
  item_order integer not null,
  name text not null,
  amount text not null,
  foreign key(recurring_movement_id) references recurring_movements(id) on delete cascade
);

create unique index if not exists uq_recurring_movement_items_order
  on recurring_movement_items(recurring_movement_id, item_order);

create index if not exists idx_recurring_movement_items_recurring
  on recurring_movement_items(recurring_movement_id);
