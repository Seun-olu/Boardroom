-- Minimal stand-in for the parts of Supabase the migrations depend on, so they
-- can run in PGlite (in-process Postgres) for tests. Mirrors Supabase's
-- auth.uid() (reads the `sub` claim) and its anon/authenticated roles.
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz default now(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase grants table/function/sequence privileges to these roles by default;
-- RLS and explicit revokes do the restricting.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
