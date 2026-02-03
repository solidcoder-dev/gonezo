truncate table budget_reservations, recurring_patterns, category_balances, allocation_rules, categories, budget_periods, budget_plans;

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');

insert into budget_periods (
  id, budget_plan_id, year, month,
  income_total_amount, income_total_currency,
  remainder_amount, remainder_currency
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  2026, 2,
  1000.00, 'USD',
  100.00, 'USD'
);

insert into categories (id, budget_plan_id, name, type, allow_negative, max_debt_amount, max_debt_currency)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Groceries', 'spending', false, null, null),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rent', 'spending', false, null, null);

insert into allocation_rules (id, budget_plan_id, category_id, percent_of_remainder)
values
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 0.6),
  ('11111111-2222-3333-4444-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 0.4);
