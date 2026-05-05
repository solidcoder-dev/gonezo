alter table expected_movements
  add column origin_occurrence_id text;

create unique index if not exists uq_expected_movements_origin_occurrence
  on expected_movements(origin_occurrence_id)
  where origin_occurrence_id is not null;
