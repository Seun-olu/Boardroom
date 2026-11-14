-- Boardroom M3: workspace invitations.
--
-- An admin invites an email address with a role. The invite carries a random
-- token; the invite link is /invite/<token>. Accepting requires being signed
-- in with a *confirmed* account whose email matches the invite, so a leaked
-- link can't be used by someone else. Email delivery is not part of this
-- migration: admins copy the link from the members page.

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) <= 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  -- 244 bits of randomness; only admins of the workspace can read it.
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);
-- One open invite per email per workspace.
create unique index workspace_invites_open_idx
  on public.workspace_invites (workspace_id, email) where accepted_at is null;
create index workspace_invites_accepted_by_idx on public.workspace_invites (accepted_by);

alter table public.workspace_invites enable row level security;
revoke all on public.workspace_invites from anon;
-- Invites are created and revoked, never edited.
revoke update on public.workspace_invites from authenticated;

create function private.stamp_invite()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.invited_by := (select auth.uid());
  new.email := lower(btrim(new.email));
  new.accepted_at := null;
  new.accepted_by := null;
  return new;
end $$;

create trigger workspace_invites_stamp before insert on public.workspace_invites
  for each row execute function private.stamp_invite();

create policy invites_select on public.workspace_invites for select to authenticated
  using (private.has_workspace_role(workspace_id, 'admin'));
create policy invites_insert on public.workspace_invites for insert to authenticated
  with check (private.has_workspace_role(workspace_id, 'admin') and role <> 'owner');
create policy invites_delete on public.workspace_invites for delete to authenticated
  using (private.has_workspace_role(workspace_id, 'admin'));

-- The caller's confirmed email, or null. auth.users isn't readable by clients,
-- so this runs as definer and only ever answers about the caller.
create function private.my_confirmed_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
$$;

-- What the invite page shows before accepting: workspace, role, and whether
-- the invite matches the signed-in account. Never returns the token or other
-- invites.
create function public.get_workspace_invite(p_token text)
returns table (workspace_name text, role public.workspace_role, email_matches boolean, expired boolean, accepted boolean)
language sql stable security definer set search_path = '' as $$
  select w.name, i.role,
         i.email = private.my_confirmed_email(),
         i.expires_at < now(),
         i.accepted_at is not null
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = p_token and (select auth.uid()) is not null
$$;

create function public.accept_workspace_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := private.my_confirmed_email();
  v_invite public.workspace_invites;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = 'PT401';
  end if;

  select * into v_invite from public.workspace_invites
  where token = p_token and accepted_at is null and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'invite not found or expired' using errcode = 'PT404';
  end if;
  if v_email is null or v_invite.email <> v_email then
    raise exception 'this invite was sent to a different email address' using errcode = 'PT403';
  end if;

  -- Joining never downgrades an existing membership.
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_uid, v_invite.role)
  on conflict (workspace_id, user_id) do update
    set role = case
      when private.role_rank(excluded.role) > private.role_rank(public.workspace_members.role)
      then excluded.role else public.workspace_members.role end;

  update public.workspace_invites set accepted_at = now(), accepted_by = v_uid
  where id = v_invite.id;

  return v_invite.workspace_id;
end $$;

revoke execute on function private.stamp_invite(), private.my_confirmed_email() from public, anon, authenticated;
revoke execute on function public.get_workspace_invite(text), public.accept_workspace_invite(text) from public, anon;
grant execute on function public.get_workspace_invite(text), public.accept_workspace_invite(text) to authenticated;
