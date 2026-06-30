-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.boards (
  id text primary key,
  columns jsonb not null default '[]'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  board jsonb not null default '{"name":"Untitled Board","initialized":false}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists boards_updated_at_idx on public.boards (updated_at);

alter table public.boards enable row level security;

-- Open board demo: anyone with the room link can read/write via the API.
-- (No user accounts — same model as the original PartyKit version.)
drop policy if exists "boards_public_select" on public.boards;
drop policy if exists "boards_public_insert" on public.boards;
drop policy if exists "boards_public_update" on public.boards;

create policy "boards_public_select"
  on public.boards for select
  using (true);

create policy "boards_public_insert"
  on public.boards for insert
  with check (true);

create policy "boards_public_update"
  on public.boards for update
  using (true)
  with check (true);
