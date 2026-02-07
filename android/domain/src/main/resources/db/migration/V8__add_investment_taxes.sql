alter table investment_transactions
  add column if not exists taxes_amount numeric(18, 2),
  add column if not exists taxes_currency text;
