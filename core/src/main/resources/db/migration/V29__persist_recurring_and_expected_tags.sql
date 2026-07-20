alter table recurring_movements add column tag_names text not null default '[]';
alter table expected_movements add column tag_names text not null default '[]';
