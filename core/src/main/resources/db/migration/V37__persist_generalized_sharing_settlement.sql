alter table sharing_expense_shares add column movement_type text not null default 'expense';
alter table sharing_expense_shares add column allocation_mode text not null default 'amounts';
alter table sharing_expense_shares add column owner_amount text;

update sharing_expense_shares
set owner_amount = total_amount - coalesce(
  (select sum(amount) from sharing_expense_share_participants where share_id = sharing_expense_shares.id),
  0
)
where owner_amount is null;

alter table sharing_expense_share_participants add column settlement_status text not null default 'not_required';
alter table sharing_expense_share_participants add column settlement_transaction_id text;

update sharing_expense_share_participants
set settlement_status = case
  when reimbursable = 0 then 'not_required'
  when expected_movement_id is not null and exists (
    select 1 from expected_movements
    where expected_movements.id = sharing_expense_share_participants.expected_movement_id
      and expected_movements.status = 'resolved'
  ) then 'settled'
  else 'pending'
end;

update sharing_expense_share_participants
set settlement_transaction_id = (
  select resolved_transaction_id
  from expected_movements
  where expected_movements.id = sharing_expense_share_participants.expected_movement_id
)
where settlement_status = 'settled';
