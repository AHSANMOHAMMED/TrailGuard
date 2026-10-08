-- Field ops schema (PGLite locally / Neon on deploy). Unowned park-wide rows.
-- Stable UUID primary keys for idempotent ConservationAPI upserts.

create table if not exists field_patrols (
  patrol_id     text primary key,
  route_id      text not null,
  route_name    text not null,
  officer_id    text not null,
  officer_name  text not null,
  status        text not null,
  started_at    timestamptz not null,
  completed_at  timestamptz,
  waypoints     jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

create table if not exists field_incidents (
  report_id         text primary key,
  category          text not null,
  description       text not null,
  lat               double precision not null,
  lng               double precision not null,
  location_source   text not null,
  observed_at       timestamptz not null,
  has_photo         boolean not null default false,
  photo_attach_id   text,
  photo_sync_state  text,
  attachments       jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);

create table if not exists field_conflicts (
  report_id    text primary key,
  type         text not null,
  location     text not null,
  channel      text not null,
  description  text not null,
  desk_status  text,
  lat          double precision,
  lng          double precision,
  updated_at   timestamptz not null default now()
);

create table if not exists field_radio (
  message_id   text primary key,
  channel      text not null,
  body         text,
  sync_state   text not null default 'SYNCED',
  updated_at   timestamptz not null default now()
);

create table if not exists field_alerts (
  alert_id       text primary key,
  animal         text not null,
  collar         text,
  zone           text not null,
  observed_at    timestamptz not null,
  received_at    timestamptz not null,
  confidence     text not null,
  status         text not null,
  assignee_id    text,
  assignee_name  text,
  outcome        text,
  resolution_note text,
  updated_at     timestamptz not null default now()
);

create table if not exists app_profiles (
  user_id       text primary key,
  display_name  text not null,
  email         text,
  role          text not null default 'COMMUNITY',
  onboarding_completed boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists field_patrols_updated_idx on field_patrols (updated_at desc);
create index if not exists field_incidents_updated_idx on field_incidents (updated_at desc);
create index if not exists field_conflicts_updated_idx on field_conflicts (updated_at desc);
create index if not exists app_profiles_role_idx on app_profiles (role);
