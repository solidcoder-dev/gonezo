alter table investment_transactions
  add column taxes_amount numeric(18, 2);

alter table investment_transactions
  add column taxes_currency text;
