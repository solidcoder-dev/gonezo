create table if not exists macro_analytics_contributors (
  owner_id text primary key,
  contributor_id text not null unique
);

create table if not exists macro_analytics_outbox (
  owner_id text not null,
  period text not null check (
    period glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]'
    and substr(period, 1, 4) between '0001' and '9999'
    and substr(period, 6, 2) between '01' and '12'
  ),
  revision integer not null check (revision >= 1),
  publication_json text not null,
  primary key(owner_id, period)
);

create table if not exists macro_analytics_latest_publications (
  contributor_id text not null,
  period text not null check (
    period glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]'
    and substr(period, 1, 4) between '0001' and '9999'
    and substr(period, 6, 2) between '01' and '12'
  ),
  revision integer not null check (revision >= 1),
  publication_json text not null,
  primary key(contributor_id, period)
);
