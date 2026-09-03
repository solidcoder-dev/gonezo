insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at)
values (
  '00000000-0000-4000-8000-000000000111',
  'Services',
  'services',
  'expense',
  'active',
  '2026-07-13T00:00:00Z',
  null
)
on conflict(name_normalized, applies_to) do nothing;
