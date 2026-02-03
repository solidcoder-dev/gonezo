truncate table budget_reservations, recurring_patterns, category_balances, allocation_rules, categories, budget_periods, budget_plans, transactions, accounts;

insert into accounts (id, user_id, name, type, currency)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Checking', 'bank', 'USD');

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');

insert into budget_periods (
  id, budget_plan_id, year, month,
  income_total_amount, income_total_currency,
  remainder_amount, remainder_currency
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  2026, 2,
  0.00, 'USD',
  0.00, 'USD'
);

insert into categories (id, budget_plan_id, name, type, allow_negative, max_debt_amount, max_debt_currency)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utilities', 'spending', false, null, null);

insert into recurring_patterns (
  id, budget_plan_id, category_id, name, cadence,
  expected_amount, expected_currency, tolerance_amount, tolerance_currency,
  merchant_matcher, billing_day, billing_month, proration, active
) values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Electric', 'monthly',
  50.00, 'USD', 5.00, 'USD',
  'electric', 10, null, null, true
);

insert into budget_reservations (
  id, budget_period_id, pattern_id, category_id, amount, currency, status, expected_effective_date, linked_transaction_id
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  50.00, 'USD', 'active', '2026-02-10', null
);

insert into transactions (
  id, account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring
) values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  '2026-02-10', '2026-02-10',
  50.00, 'USD', 'expense', 'Electric Co', null, false
);
