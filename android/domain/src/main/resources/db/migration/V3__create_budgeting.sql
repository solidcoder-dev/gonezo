create table if not exists budget_plans (
  id text primary key,
  user_id text not null,
  period text not null,
  negative_policy text not null,
  reservation_policy text not null,
  effective_dating_policy text not null
);

create table if not exists budget_periods (
  id text primary key,
  budget_plan_id text not null references budget_plans(id),
  year int not null,
  month int not null,
  income_total_amount numeric(18, 2) not null,
  income_total_currency text not null,
  remainder_amount numeric(18, 2) not null,
  remainder_currency text not null,
  unique (budget_plan_id, year, month)
);
