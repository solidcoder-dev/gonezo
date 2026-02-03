create table if not exists recurring_patterns (
  id uuid primary key,
  budget_plan_id uuid not null references budget_plans(id),
  category_id uuid not null references categories(id),
  name text not null,
  cadence text not null,
  expected_amount numeric(18, 2) not null,
  expected_currency text not null,
  tolerance_amount numeric(18, 2) not null,
  tolerance_currency text not null,
  merchant_matcher text not null,
  billing_day int null,
  billing_month int null,
  proration text null,
  active boolean not null
);

create table if not exists budget_reservations (
  id uuid primary key,
  budget_period_id uuid not null references budget_periods(id),
  pattern_id uuid not null references recurring_patterns(id),
  category_id uuid not null references categories(id),
  amount numeric(18, 2) not null,
  currency text not null,
  status text not null,
  expected_effective_date date not null,
  linked_transaction_id uuid null
);
