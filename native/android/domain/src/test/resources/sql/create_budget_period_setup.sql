delete from budget_links;
delete from budget_reservations;
delete from recurring_patterns;
delete from category_balances;
delete from allocation_rules;
delete from categories;
delete from budget_periods;
delete from budget_plans;

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');
