create table if not exists accounts (
  id text primary key,
  user_id text not null,
  name text not null,
  type text not null,
  currency text not null
);
