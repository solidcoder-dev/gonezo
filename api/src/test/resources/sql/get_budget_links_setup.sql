truncate table budget_links, investment_transactions, assets, financial_containers, category_balances, budget_reservations, recurring_patterns, allocation_rules, categories, budget_periods, budget_plans;

insert into financial_containers (id, user_id, name, container_type, currency)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Brokerage', 'broker', 'USD');

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');

insert into budget_periods (
  id, budget_plan_id, year, month,
  income_total_amount, income_total_currency,
  remainder_amount, remainder_currency
) values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  2026, 2,
  0.00, 'USD',
  0.00, 'USD'
);

insert into categories (id, budget_plan_id, name, type, allow_negative, max_debt_amount, max_debt_currency)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Investments', 'sinking_fund', false, null, null);

insert into investment_transactions (
  id, container_id, date, type, asset_id, quantity, amount, currency, fees_amount, fees_currency, note
) values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '2026-02-03',
  'buy',
  null,
  null,
  100.00,
  'USD',
  2.00,
  'USD',
  'test'
);

insert into budget_links (
  id, budget_period_id, category_id, linked_type, linked_id, budget_impact_amount, budget_impact_currency
) values (
  '11111111-2222-3333-4444-555555555555',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'investment_transaction',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  102.00,
  'USD'
);
