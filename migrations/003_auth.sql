create table if not exists coordinator_users (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  username text not null unique,
  password_hash text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_coord_users_center on coordinator_users(center_id);

create table if not exists coordinator_invites (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  token text not null unique,
  username text not null,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_coord_invites_token on coordinator_invites(token);

create table if not exists coordinator_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references coordinator_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_coord_sessions_hash on coordinator_sessions(token_hash);
