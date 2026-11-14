-- Boardroom M2: relational schema, workspace roles, row-level security,
-- database-enforced optimistic concurrency, activity log, idempotent actions.
--
-- Design notes
-- * Every board row lives in a workspace; access is decided by the caller's
--   role in that workspace (owner > admin > member > viewer).
-- * boards / board_columns / cards carry a `version`. A BEFORE UPDATE trigger
--   rejects any update that doesn't set version = old.version + 1, so *every*
--   write path (RPC or direct PostgREST) gets optimistic concurrency.
-- * Audit fields (created_by, updated_by) are stamped from auth.uid(), never
--   taken from the client.
-- * apply_board_action() is the API's write path: one transaction per action,
--   idempotent per (user, client_action_id), returns ok / conflict / rejected.

-- ── Legacy single-row JSON table ─────────────────────────────────────────
-- The pre-M2 app stored a whole board as JSON in public.boards(id text).
-- Keep its data, move it out of the way, and close it to clients.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'boards' and column_name = 'cards'
  ) then
    alter table public.boards rename to legacy_boards;
    drop policy if exists "boards_public_select" on public.legacy_boards;
    drop policy if exists "boards_public_insert" on public.legacy_boards;
    drop policy if exists "boards_public_update" on public.legacy_boards;
    alter table public.legacy_boards enable row level security;
    revoke all on public.legacy_boards from anon, authenticated;
  end if;
end $$;

-- ── Types ────────────────────────────────────────────────────────────────
create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.card_priority as enum ('low', 'medium', 'high', 'urgent');

-- ── Tables ───────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  avatar_color text not null default '#6366F1' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  version integer not null default 1 check (version > 0),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index boards_workspace_idx on public.boards (workspace_id);

create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Fractional ordering: moving a lane only rewrites that lane's row.
  position double precision not null,
  version integer not null default 1 check (version > 0),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, board_id)
);
create index board_columns_board_idx on public.board_columns (board_id, position);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  column_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  priority public.card_priority not null default 'medium',
  story_points numeric(4, 1) check (story_points between 0 and 100),
  subtasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(subtasks) = 'array' and jsonb_array_length(subtasks) <= 100),
  assignee_id uuid references auth.users (id) on delete set null,
  position double precision not null,
  version integer not null default 1 check (version > 0),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A card's column must belong to the same board.
  foreign key (column_id, board_id) references public.board_columns (id, board_id) on delete cascade,
  unique (id, board_id)
);
create index cards_board_idx on public.cards (board_id);
create index cards_column_idx on public.cards (column_id, position);
create index cards_assignee_idx on public.cards (assignee_id);
create index cards_column_board_idx on public.cards (column_id, board_id);

create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null,
  board_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  foreign key (card_id, board_id) references public.cards (id, board_id) on delete cascade
);
create index card_comments_card_idx on public.card_comments (card_id, created_at);
create index card_comments_board_idx on public.card_comments (board_id);
create index card_comments_card_board_idx on public.card_comments (card_id, board_id);
create index card_comments_author_idx on public.card_comments (author_id);

create table public.activity_events (
  id bigint generated always as identity primary key,
  board_id uuid not null references public.boards (id) on delete cascade,
  actor_id uuid,
  entity text not null check (entity in ('board', 'column', 'card', 'comment')),
  entity_id uuid not null,
  action text not null check (action in ('created', 'updated', 'moved', 'deleted', 'renamed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_events_board_idx on public.activity_events (board_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('assigned', 'mention', 'comment')),
  board_id uuid not null references public.boards (id) on delete cascade,
  card_id uuid,
  actor_id uuid,
  summary jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_board_idx on public.notifications (board_id);

-- One row per (user, clientActionId): replaying an action returns the stored result.
create table public.processed_actions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_action_id text not null check (char_length(client_action_id) between 1 and 80),
  board_id uuid not null references public.boards (id) on delete cascade,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, client_action_id)
);
create index processed_actions_board_idx on public.processed_actions (board_id);

-- ── Role helpers ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies can consult membership without recursing
-- through workspace_members' own RLS. Each only answers about the caller.
-- They live in a `private` schema that PostgREST doesn't expose, so they
-- can't be called as /rpc endpoints; `authenticated` may still execute them
-- because RLS policies run with the caller's privileges.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.role_rank(r public.workspace_role)
returns integer language sql immutable set search_path = '' as $$
  select case r when 'viewer' then 1 when 'member' then 2 when 'admin' then 3 when 'owner' then 4 end
$$;

create function private.workspace_role_of(ws uuid)
returns public.workspace_role language sql stable security definer set search_path = '' as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = (select auth.uid())
$$;

create function private.has_workspace_role(ws uuid, min_role public.workspace_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.role_rank(private.workspace_role_of(ws)) >= private.role_rank(min_role), false)
$$;

create function private.has_board_role(b uuid, min_role public.workspace_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select private.has_workspace_role(bd.workspace_id, min_role) from public.boards bd where bd.id = b),
    false
  )
$$;

create function private.shares_workspace_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  )
$$;

-- ── Triggers: profiles, workspace ownership ──────────────────────────────
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New user'
    ), 60)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.stamp_workspace_creator()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_by := (select auth.uid());
  if new.created_by is null then
    raise exception 'authentication required' using errcode = 'PT401';
  end if;
  return new;
end $$;

create trigger workspaces_stamp_creator
  before insert on public.workspaces
  for each row execute function public.stamp_workspace_creator();

create function public.add_workspace_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return null;
end $$;

create trigger workspaces_add_owner
  after insert on public.workspaces
  for each row execute function public.add_workspace_owner();

-- ── Triggers: versioning + audit stamping ────────────────────────────────
create function public.stamp_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := 1;
  new.created_by := (select auth.uid());
  new.updated_by := new.created_by;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

-- PostgREST maps SQLSTATE PTxxx to HTTP status xxx, so a stale write is a 409.
create function public.enforce_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.version is distinct from old.version + 1 then
    raise exception 'version conflict on % % (current %, attempted %)',
      tg_table_name, old.id, old.version, new.version
      using errcode = 'PT409';
  end if;
  if new.id is distinct from old.id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable column changed on %', tg_table_name using errcode = 'PT400';
  end if;
  if tg_table_name = 'boards' then
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'boards cannot change workspace' using errcode = 'PT400';
    end if;
  elsif new.board_id is distinct from old.board_id then
    raise exception '% cannot change board', tg_table_name using errcode = 'PT400';
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;

create trigger boards_stamp_insert before insert on public.boards
  for each row execute function public.stamp_insert();
create trigger boards_enforce_version before update on public.boards
  for each row execute function public.enforce_version();
create trigger board_columns_stamp_insert before insert on public.board_columns
  for each row execute function public.stamp_insert();
create trigger board_columns_enforce_version before update on public.board_columns
  for each row execute function public.enforce_version();
create trigger cards_stamp_insert before insert on public.cards
  for each row execute function public.stamp_insert();
create trigger cards_enforce_version before update on public.cards
  for each row execute function public.enforce_version();

-- Assignees must be members of the board's workspace.
create function public.check_card_assignee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.boards b
    join public.workspace_members m on m.workspace_id = b.workspace_id
    where b.id = new.board_id and m.user_id = new.assignee_id
  ) then
    raise exception 'assignee is not a member of this workspace' using errcode = 'PT400';
  end if;
  return new;
end $$;

create trigger cards_check_assignee before insert or update of assignee_id on public.cards
  for each row execute function public.check_card_assignee();

-- ── Trigger: activity log ────────────────────────────────────────────────
create function public.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_board uuid;
  v_entity text;
  v_entity_id uuid;
  v_action text;
  v_summary jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'boards' then
    if tg_op <> 'UPDATE' or new.name = old.name then return null; end if;
    v_board := new.id; v_entity := 'board'; v_entity_id := new.id; v_action := 'renamed';
    v_summary := jsonb_build_object('from', old.name, 'to', new.name);

  elsif tg_table_name = 'board_columns' then
    v_entity := 'column';
    if tg_op = 'DELETE' then
      v_board := old.board_id; v_entity_id := old.id; v_action := 'deleted';
      v_summary := jsonb_build_object('title', old.title);
    else
      v_board := new.board_id; v_entity_id := new.id;
      v_action := case when tg_op = 'INSERT' then 'created'
                       when new.position <> old.position and new.title = old.title then 'moved'
                       else 'updated' end;
      v_summary := jsonb_build_object('title', new.title);
    end if;

  elsif tg_table_name = 'cards' then
    v_entity := 'card';
    if tg_op = 'DELETE' then
      -- Cards removed by a lane deletion are covered by the lane's event.
      if not exists (select 1 from public.board_columns c where c.id = old.column_id) then
        return null;
      end if;
      v_board := old.board_id; v_entity_id := old.id; v_action := 'deleted';
      v_summary := jsonb_build_object('title', old.title);
    elsif tg_op = 'INSERT' then
      v_board := new.board_id; v_entity_id := new.id; v_action := 'created';
      v_summary := jsonb_build_object('title', new.title, 'column_id', new.column_id);
    else
      v_board := new.board_id; v_entity_id := new.id;
      if new.column_id <> old.column_id or new.position <> old.position then
        v_action := 'moved';
        v_summary := jsonb_build_object('title', new.title, 'from_column', old.column_id, 'to_column', new.column_id);
      else
        v_action := 'updated';
        v_summary := jsonb_build_object(
          'title', new.title,
          'fields', to_jsonb(array_remove(array[
            case when new.title <> old.title then 'title' end,
            case when new.description <> old.description then 'description' end,
            case when new.priority <> old.priority then 'priority' end,
            case when new.story_points is distinct from old.story_points then 'story_points' end,
            case when new.subtasks <> old.subtasks then 'subtasks' end,
            case when new.assignee_id is distinct from old.assignee_id then 'assignee' end
          ], null))
        );
      end if;
    end if;

  elsif tg_table_name = 'card_comments' then
    if tg_op <> 'INSERT' then return null; end if;
    v_board := new.board_id; v_entity := 'comment'; v_entity_id := new.id; v_action := 'created';
    v_summary := jsonb_build_object('card_id', new.card_id);
  end if;

  -- During a cascading board delete the board row is already gone.
  if not exists (select 1 from public.boards b where b.id = v_board) then
    return null;
  end if;

  insert into public.activity_events (board_id, actor_id, entity, entity_id, action, summary)
  values (v_board, (select auth.uid()), v_entity, v_entity_id, v_action, v_summary);
  return null;
end $$;

create trigger boards_activity after update on public.boards
  for each row execute function public.log_activity();
create trigger board_columns_activity after insert or update or delete on public.board_columns
  for each row execute function public.log_activity();
create trigger cards_activity after insert or update or delete on public.cards
  for each row execute function public.log_activity();
create trigger card_comments_activity after insert on public.card_comments
  for each row execute function public.log_activity();

-- ── Write path: one idempotent, versioned action ─────────────────────────
-- SECURITY INVOKER: every statement below is still subject to RLS.
create function public.apply_board_action(
  p_board uuid,
  p_client_action_id text,
  p_action jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_type text := p_action ->> 'type';
  v_id uuid;
  v_expected integer;
  v_result jsonb;
  v_claimed boolean;
  v_card public.cards;
  v_col public.board_columns;
  v_board public.boards;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = 'PT401';
  end if;
  if not private.has_board_role(p_board, 'member') then
    raise exception 'not allowed to edit this board' using errcode = 'PT403';
  end if;

  -- Claim the action id. A concurrent duplicate blocks here until the first
  -- commits, then sees the claim and returns the stored result.
  insert into public.processed_actions (user_id, client_action_id, board_id)
  values (v_uid, p_client_action_id, p_board)
  on conflict do nothing
  returning true into v_claimed;

  if v_claimed is null then
    select result into v_result from public.processed_actions
    where user_id = v_uid and client_action_id = p_client_action_id;
    return coalesce(v_result, '{}'::jsonb) || jsonb_build_object('replayed', true);
  end if;

  v_id := nullif(p_action ->> 'id', '')::uuid;
  v_expected := (p_action ->> 'expectedVersion')::integer;

  case v_type
  when 'rename_board' then
    update public.boards set name = p_action ->> 'name', version = v_expected + 1
    where id = p_board and version = v_expected
    returning * into v_board;
    v_result := case when v_board.id is null
      then jsonb_build_object('status', 'conflict', 'entity', 'board',
             'current', (select to_jsonb(b) from public.boards b where b.id = p_board))
      else jsonb_build_object('status', 'ok', 'entity', 'board', 'row', to_jsonb(v_board)) end;

  when 'add_column' then
    insert into public.board_columns (id, board_id, title, color, position)
    values (
      coalesce(v_id, gen_random_uuid()), p_board, p_action ->> 'title', p_action ->> 'color',
      coalesce((p_action ->> 'position')::double precision,
               (select coalesce(max(position), 0) + 1 from public.board_columns where board_id = p_board))
    )
    returning * into v_col;
    v_result := jsonb_build_object('status', 'ok', 'entity', 'column', 'row', to_jsonb(v_col));

  when 'update_column', 'move_column' then
    update public.board_columns set
      title = case when p_action ? 'title' then p_action ->> 'title' else title end,
      color = case when p_action ? 'color' then p_action ->> 'color' else color end,
      position = case when p_action ? 'position' then (p_action ->> 'position')::double precision else position end,
      version = v_expected + 1
    where id = v_id and board_id = p_board and version = v_expected
    returning * into v_col;
    v_result := case when v_col.id is null
      then jsonb_build_object('status', 'conflict', 'entity', 'column',
             'current', (select to_jsonb(c) from public.board_columns c where c.id = v_id and c.board_id = p_board))
      else jsonb_build_object('status', 'ok', 'entity', 'column', 'row', to_jsonb(v_col)) end;

  when 'delete_column' then
    if (select count(*) from public.board_columns where board_id = p_board) <= 1 then
      v_result := jsonb_build_object('status', 'rejected', 'reason', 'last_column');
    else
      delete from public.board_columns
      where id = v_id and board_id = p_board and version = v_expected
      returning * into v_col;
      v_result := case when v_col.id is null
        then jsonb_build_object('status', 'conflict', 'entity', 'column',
               'current', (select to_jsonb(c) from public.board_columns c where c.id = v_id and c.board_id = p_board))
        else jsonb_build_object('status', 'ok', 'entity', 'column', 'deleted', v_id) end;
    end if;

  when 'add_card' then
    insert into public.cards (id, board_id, column_id, title, description, priority, story_points, position)
    values (
      coalesce(v_id, gen_random_uuid()), p_board, (p_action ->> 'columnId')::uuid,
      p_action ->> 'title', coalesce(p_action ->> 'description', ''),
      coalesce((p_action ->> 'priority')::public.card_priority, 'medium'),
      (p_action ->> 'storyPoints')::numeric,
      coalesce((p_action ->> 'position')::double precision,
               (select coalesce(max(position), 0) + 1 from public.cards
                where column_id = (p_action ->> 'columnId')::uuid))
    )
    returning * into v_card;
    v_result := jsonb_build_object('status', 'ok', 'entity', 'card', 'row', to_jsonb(v_card));

  when 'update_card', 'move_card' then
    update public.cards set
      title = case when p_action ? 'title' then p_action ->> 'title' else title end,
      description = case when p_action ? 'description' then p_action ->> 'description' else description end,
      priority = case when p_action ? 'priority' then (p_action ->> 'priority')::public.card_priority else priority end,
      story_points = case when p_action ? 'storyPoints' then (p_action ->> 'storyPoints')::numeric else story_points end,
      subtasks = case when p_action ? 'subtasks' then p_action -> 'subtasks' else subtasks end,
      assignee_id = case when p_action ? 'assigneeId' then (p_action ->> 'assigneeId')::uuid else assignee_id end,
      column_id = case when p_action ? 'columnId' then (p_action ->> 'columnId')::uuid else column_id end,
      position = case when p_action ? 'position' then (p_action ->> 'position')::double precision else position end,
      version = v_expected + 1
    where id = v_id and board_id = p_board and version = v_expected
    returning * into v_card;
    v_result := case when v_card.id is null
      then jsonb_build_object('status', 'conflict', 'entity', 'card',
             'current', (select to_jsonb(c) from public.cards c where c.id = v_id and c.board_id = p_board))
      else jsonb_build_object('status', 'ok', 'entity', 'card', 'row', to_jsonb(v_card)) end;

  when 'delete_card' then
    delete from public.cards
    where id = v_id and board_id = p_board and version = v_expected
    returning * into v_card;
    v_result := case when v_card.id is null
      then jsonb_build_object('status', 'conflict', 'entity', 'card',
             'current', (select to_jsonb(c) from public.cards c where c.id = v_id and c.board_id = p_board))
      else jsonb_build_object('status', 'ok', 'entity', 'card', 'deleted', v_id) end;

  else
    raise exception 'unknown action type %', coalesce(v_type, '(none)') using errcode = 'PT400';
  end case;

  update public.processed_actions set result = v_result
  where user_id = v_uid and client_action_id = p_client_action_id;
  return v_result;
end $$;

-- ── Row-level security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.board_columns enable row level security;
alter table public.cards enable row level security;
alter table public.card_comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.processed_actions enable row level security;

-- Anonymous visitors get nothing; the demo runs entirely in the browser.
revoke all on public.profiles, public.workspaces, public.workspace_members, public.boards,
  public.board_columns, public.cards, public.card_comments, public.activity_events,
  public.notifications, public.processed_actions from anon;

-- Activity is written only by the definer trigger; notifications only by the
-- server, and users may only mark theirs read.
revoke insert, update, delete on public.activity_events from authenticated;
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_workspace_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_select on public.workspaces for select to authenticated
  using (private.has_workspace_role(id, 'viewer') or created_by = (select auth.uid()));
create policy workspaces_insert on public.workspaces for insert to authenticated
  with check ((select auth.uid()) is not null);
create policy workspaces_update on public.workspaces for update to authenticated
  using (private.has_workspace_role(id, 'admin')) with check (private.has_workspace_role(id, 'admin'));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (private.has_workspace_role(id, 'owner'));

-- Admins may change a member's role, never which user/workspace the row is for.
revoke update on public.workspace_members from authenticated;
grant update (role) on public.workspace_members to authenticated;

create policy members_select on public.workspace_members for select to authenticated
  using (private.has_workspace_role(workspace_id, 'viewer'));
create policy members_insert on public.workspace_members for insert to authenticated
  with check (private.has_workspace_role(workspace_id, 'admin') and role <> 'owner');
create policy members_update on public.workspace_members for update to authenticated
  using (private.has_workspace_role(workspace_id, 'admin') and role <> 'owner')
  with check (private.has_workspace_role(workspace_id, 'admin') and role <> 'owner');
create policy members_delete on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (
    private.has_workspace_role(workspace_id, 'admin') or user_id = (select auth.uid())
  ));

create policy boards_select on public.boards for select to authenticated
  using (private.has_workspace_role(workspace_id, 'viewer'));
create policy boards_insert on public.boards for insert to authenticated
  with check (private.has_workspace_role(workspace_id, 'member'));
create policy boards_update on public.boards for update to authenticated
  using (private.has_workspace_role(workspace_id, 'member'))
  with check (private.has_workspace_role(workspace_id, 'member'));
create policy boards_delete on public.boards for delete to authenticated
  using (private.has_workspace_role(workspace_id, 'admin'));

create policy columns_select on public.board_columns for select to authenticated
  using (private.has_board_role(board_id, 'viewer'));
create policy columns_insert on public.board_columns for insert to authenticated
  with check (private.has_board_role(board_id, 'member'));
create policy columns_update on public.board_columns for update to authenticated
  using (private.has_board_role(board_id, 'member')) with check (private.has_board_role(board_id, 'member'));
create policy columns_delete on public.board_columns for delete to authenticated
  using (private.has_board_role(board_id, 'member'));

create policy cards_select on public.cards for select to authenticated
  using (private.has_board_role(board_id, 'viewer'));
create policy cards_insert on public.cards for insert to authenticated
  with check (private.has_board_role(board_id, 'member'));
create policy cards_update on public.cards for update to authenticated
  using (private.has_board_role(board_id, 'member')) with check (private.has_board_role(board_id, 'member'));
create policy cards_delete on public.cards for delete to authenticated
  using (private.has_board_role(board_id, 'member'));

create policy comments_select on public.card_comments for select to authenticated
  using (private.has_board_role(board_id, 'viewer'));
create policy comments_insert on public.card_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.has_board_role(board_id, 'member'));
create policy comments_update on public.card_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_delete on public.card_comments for delete to authenticated
  using (author_id = (select auth.uid()) or private.has_board_role(board_id, 'admin'));

create policy activity_select on public.activity_events for select to authenticated
  using (private.has_board_role(board_id, 'viewer'));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy processed_select on public.processed_actions for select to authenticated
  using (user_id = (select auth.uid()));
create policy processed_insert on public.processed_actions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.has_board_role(board_id, 'member'));
create policy processed_update on public.processed_actions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Helper functions are internal; only the action RPC is part of the API.
revoke execute on function public.handle_new_user(), public.add_workspace_owner(),
  public.log_activity(), public.check_card_assignee() from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke execute on function public.apply_board_action(uuid, text, jsonb) from public, anon;
grant execute on function public.apply_board_action(uuid, text, jsonb) to authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────
-- Postgres Changes respects RLS, so subscribers only receive rows they can read.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.boards, public.board_columns, public.cards, public.card_comments;
  end if;
end $$;
