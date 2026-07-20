create unique index if not exists uq_expected_item_template_per_occurrence
  on expected_movement_items(expected_movement_id, source_template_item_id)
  where source_template_item_id is not null;
