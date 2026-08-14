alter table centers add column if not exists verified_at timestamptz;
alter table centers add column if not exists verified_by text;

create table if not exists center_slug_aliases (
  id         uuid        primary key default gen_random_uuid(),
  center_id  uuid        not null references centers(id) on delete cascade,
  slug       text        not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_slug_aliases_slug on center_slug_aliases(slug);
