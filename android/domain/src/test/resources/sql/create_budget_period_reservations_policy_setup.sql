delete from budget_links, budget_reservations, recurring_patterns, category_balances, allocation_rules, categories, budget_periods, budget_plans;

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');

insert into categories (id, budget_plan_id, name, type, allow_negative, max_debt_amount, max_debt_currency)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utilities', 'spending', false, null, null),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Subscriptions', 'spending', false, null, null);

insert into recurring_patterns (
  id, budget_plan_id, category_id, name, cadence,
  expected_amount, expected_currency, tolerance_amount, tolerance_currency,
  merchant_matcher, billing_day, billing_month, proration, active
) values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Electric', 'monthly',
    40.00, 'USD', 5.00, 'USD',
    'electric', 10, null, null, true
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Streaming', 'monthly',
    12.00, 'USD', 2.00, 'USD',
    'stream', 5, null, null, true
  );
