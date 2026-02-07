create table if not exists budget_plans (
  id uuid primary key,
  user_id uuid not null,
  period text not null,
  negative_policy text not null,
  reservation_policy text not null,
  effective_dating_policy text not null
);

create table if not exists budget_periods (
  id uuid primary key,
  budget_plan_id uuid not null references budget_plans(id),
  year int not null,
  month int not null,
  income_total_amount numeric(18, 2) not null,
  income_total_currency text not null,
  remainder_amount numeric(18, 2) not null,
  remainder_currency text not null,
  unique (budget_plan_id, year, month)
);
