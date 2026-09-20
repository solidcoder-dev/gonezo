alter table recurring_movement_occurrences
  add column schedule_kind text not null default 'recurring'
  check (schedule_kind in ('recurring', 'one_shot'));

update recurring_movement_occurrences
set schedule_kind = case
  when (
    select end_kind = 'after_occurrences' and end_after_occurrences = 1
    from recurring_movements
    where recurring_movements.id = recurring_movement_occurrences.recurring_movement_id
  ) then 'one_shot'
  else 'recurring'
end;
