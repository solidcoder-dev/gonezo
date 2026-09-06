alter table expected_movement_items add column tag_names text not null default '[]';
alter table recurring_movement_items add column tag_names text not null default '[]';
