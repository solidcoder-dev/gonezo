alter table recurring_movements
  add column review_policy text not null default 'automatic';

alter table expected_movements
  add column origin_recurring_movement_id text;

create index if not exists idx_expected_movements_origin_recurring
  on expected_movements(origin_recurring_movement_id)
  where origin_recurring_movement_id is not null;
