delete from transactions;
delete from accounts;

insert into accounts (id, user_id, name, type, currency)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Checking', 'bank', 'USD'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Savings', 'bank', 'USD');
