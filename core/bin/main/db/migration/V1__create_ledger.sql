create table if not exists ledger_accounts (
  id text primary key,
  name text not null,
  type text not null,
  currency text not null,
  status text not null,
  created_at text not null,
  archived_at text null
);

create table if not exists ledger_transactions (
  id text primary key,
  account_id text not null references ledger_accounts(id),
  type text not null,
  amount numeric(18, 2) not null,
  currency text not null,
  occurred_at text not null,
  description text null,
  merchant text null,
  category_id text null,
  status text not null,
  linked_transaction_id text null
);

create index if not exists idx_ledger_transactions_account_occurred
  on ledger_transactions(account_id, occurred_at desc);
create index if not exists idx_ledger_transactions_account_category
  on ledger_transactions(account_id, category_id);
create index if not exists idx_ledger_transactions_account_merchant
  on ledger_transactions(account_id, merchant);

create table if not exists ledger_transaction_items (
  id text primary key,
  transaction_id text not null references ledger_transactions(id) on delete cascade,
  name text not null,
  amount numeric(18, 2) not null,
  currency text not null,
  category_id text null,
  note text null
);

create index if not exists idx_ledger_items_transaction_id
  on ledger_transaction_items(transaction_id);
