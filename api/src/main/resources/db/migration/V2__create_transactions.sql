create table if not exists transactions (
  id uuid primary key,
  account_id uuid not null references accounts(id),
  posted_date date not null,
  effective_date date not null,
  amount numeric(18, 2) not null,
  currency text not null,
  type text not null,
  merchant text null,
  category_id uuid null,
  recurring boolean not null
);
