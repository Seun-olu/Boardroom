-- Run this if you already ran an older schema.sql (fixes "row-level security" write errors)

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
