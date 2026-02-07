create table if not exists categories (
  id uuid primary key,
  budget_plan_id uuid not null references budget_plans(id),
  name text not null,
  type text not null,
  allow_negative boolean not null,
  max_debt_amount numeric(18, 2) null,
  max_debt_currency text null
);

create table if not exists allocation_rules (
  id uuid primary key,
  budget_plan_id uuid not null references budget_plans(id),
  category_id uuid not null references categories(id),
  percent_of_remainder numeric(8, 6) not null
);

create table if not exists category_balances (
  id uuid primary key,
  budget_period_id uuid not null references budget_periods(id),
  category_id uuid not null references categories(id),
  opening_balance_amount numeric(18, 2) not null,
  opening_balance_currency text not null,
  allocated_amount numeric(18, 2) not null,
  allocated_currency text not null,
  spent_amount numeric(18, 2) not null,
  spent_currency text not null,
  available_amount numeric(18, 2) not null,
  available_currency text not null,
  reserved_amount numeric(18, 2) not null,
  reserved_currency text not null,
  safe_to_spend_amount numeric(18, 2) not null,
  safe_to_spend_currency text not null
);
