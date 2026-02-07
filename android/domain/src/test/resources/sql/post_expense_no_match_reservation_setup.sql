delete from budget_links, budget_reservations, recurring_patterns, category_balances, allocation_rules, categories, budget_periods, budget_plans, transactions, accounts;

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

insert into category_balances (
  id, budget_period_id, category_id,
  opening_balance_amount, opening_balance_currency,
  allocated_amount, allocated_currency,
  spent_amount, spent_currency,
  available_amount, available_currency,
  reserved_amount, reserved_currency,
  safe_to_spend_amount, safe_to_spend_currency
) values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  0.00, 'USD',
  100.00, 'USD',
  0.00, 'USD',
  100.00, 'USD',
  50.00, 'USD',
  50.00, 'USD'
);

insert into recurring_patterns (
  id, budget_plan_id, category_id, name, cadence,
  expected_amount, expected_currency, tolerance_amount, tolerance_currency,
  merchant_matcher, billing_day, billing_month, proration, active
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Electric', 'monthly',
  50.00, 'USD', 5.00, 'USD',
  'electric', 10, null, null, true
);

insert into budget_reservations (
  id, budget_period_id, pattern_id, category_id, amount, currency, status, expected_effective_date, linked_transaction_id
) values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  50.00, 'USD', 'active', '2026-02-10', null
);
