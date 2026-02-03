create table if not exists financial_containers (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  container_type text not null,
  currency text not null
);

create table if not exists assets (
  id uuid primary key,
  symbol_or_name text not null,
  asset_type text not null,
  currency text not null
);

create table if not exists investment_transactions (
  id uuid primary key,
  container_id uuid not null references financial_containers(id),
  date date not null,
  type text not null,
  asset_id uuid null references assets(id),
  quantity numeric(18, 6) null,
  amount numeric(18, 2) not null,
  currency text not null,
  fees_amount numeric(18, 2) null,
  fees_currency text null,
  note text null
);

create table if not exists budget_links (
  id uuid primary key,
  budget_period_id uuid not null references budget_periods(id),
  category_id uuid not null references categories(id),
  linked_type text not null,
  linked_id uuid not null,
  budget_impact_amount numeric(18, 2) not null,
  budget_impact_currency text not null
);
