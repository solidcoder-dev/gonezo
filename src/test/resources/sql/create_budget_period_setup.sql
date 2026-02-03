truncate table budget_periods, budget_plans;

insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
values ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', 'monthly', 'allow_with_max_debt', 'reserve_start_of_period', 'use_effective_date');
