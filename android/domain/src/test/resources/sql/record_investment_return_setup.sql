delete from budget_links;
delete from investment_transactions;
delete from assets;
delete from financial_containers;

insert into financial_containers (id, user_id, name, container_type, currency)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Brokerage', 'broker', 'USD');
