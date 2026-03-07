delete from budget_links;
delete from budget_reservations;
delete from recurring_patterns;
delete from category_balances;
delete from allocation_rules;
delete from categories;
delete from budget_periods;
delete from budget_plans;
delete from transactions;
delete from accounts;

insert into accounts (id, user_id, name, type, currency)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Daily Spending', 'card', 'USD');

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'monthly', 'disallow', 'reserve_start_of_period', 'use_effective_date');

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
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Groceries', 'spending', false, null, null);

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
  10.00, 'USD',
  0.00, 'USD',
  10.00, 'USD',
  0.00, 'USD',
  10.00, 'USD'
);
