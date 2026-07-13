insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at)
values
  ('00000000-0000-4000-8000-000000000101', 'Bills', 'bills', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000102', 'Groceries', 'groceries', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000103', 'Dining', 'dining', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000104', 'Transport', 'transport', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000105', 'Health', 'health', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000106', 'Shopping', 'shopping', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000107', 'Entertainment', 'entertainment', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000108', 'Travel', 'travel', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000109', 'Other', 'other', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000110', 'Beauty', 'beauty', 'expense', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000201', 'Work Income', 'work income', 'income', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000202', 'Investments', 'investments', 'income', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000203', 'Reimbursements', 'reimbursements', 'income', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000204', 'Gifts & Benefits', 'gifts & benefits', 'income', 'active', '2026-07-13T00:00:00Z', null),
  ('00000000-0000-4000-8000-000000000205', 'Other', 'other', 'income', 'active', '2026-07-13T00:00:00Z', null)
on conflict(name_normalized, applies_to) do nothing;
