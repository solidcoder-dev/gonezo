create table if not exists accounts (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  type text not null,
  currency text not null
);
