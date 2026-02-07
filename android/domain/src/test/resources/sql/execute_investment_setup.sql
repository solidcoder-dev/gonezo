delete from budget_links, investment_transactions, assets, financial_containers, category_balances, budget_reservations, recurring_patterns, allocation_rules, categories, budget_periods, budget_plans;

insert into financial_containers (id, user_id, name, container_type, currency)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Brokerage', 'broker', 'USD');

insert into assets (id, symbol_or_name, asset_type, currency)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ACME', 'stock', 'USD');

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');

insert into budget_periods (
  id, budget_plan_id, year, month,
  income_total_amount, income_total_currency,
  remainder_amount, remainder_currency
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  2026, 2,
  0.00, 'USD',
  0.00, 'USD'
);

insert into categories (id, budget_plan_id, name, type, allow_negative, max_debt_amount, max_debt_currency)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Investments', 'sinking_fund', false, null, null);

insert into category_balances (
  id, budget_period_id, category_id,
  opening_balance_amount, opening_balance_currency,
  allocated_amount, allocated_currency,
  spent_amount, spent_currency,
  available_amount, available_currency,
  reserved_amount, reserved_currency,
  safe_to_spend_amount, safe_to_spend_currency
) values (
  '99999999-9999-9999-9999-999999999999',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  0.00, 'USD',
  300.00, 'USD',
  0.00, 'USD',
  300.00, 'USD',
  0.00, 'USD',
  300.00, 'USD'
);
