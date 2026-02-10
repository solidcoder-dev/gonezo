truncate table budget_links, investment_transactions, assets, financial_containers;

insert into financial_containers (id, user_id, name, container_type, currency)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Brokerage', 'broker', 'USD');

insert into assets (id, symbol_or_name, asset_type, currency)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ACME', 'stock', 'USD');

insert into investment_transactions (
  id, container_id, date, type, asset_id, quantity, amount, currency, fees_amount, fees_currency, note
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2026-02-02',
    'buy',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    1.5,
    150.00,
    'USD',
    1.00,
    'USD',
    'test'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2026-02-03',
    'dividend',
    null,
    null,
    12.34,
    'USD',
    null,
    null,
    'dividend'
  );
