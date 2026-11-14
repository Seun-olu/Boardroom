import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { beforeAll, describe, expect, test } from "vitest";

/**
 * Runs the real migrations in PGlite and exercises them as Supabase's
 * `authenticated` / `anon` roles with a JWT `sub` claim, exactly as PostgREST
 * would. Row-level security applies because these roles don't own the tables.
 */

const dir = join(__dirname, "..");
const stub = readFileSync(join(__dirname, "supabase-stub.sql"), "utf8");
const migrations = readdirSync(join(dir, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(dir, "migrations", f), "utf8"));

const OWNER = "00000000-0000-4000-8000-000000000001";
const MEMBER = "00000000-0000-4000-8000-000000000002";
const VIEWER = "00000000-0000-4000-8000-000000000003";
const OUTSIDER = "00000000-0000-4000-8000-000000000004";
const ADMIN = "00000000-0000-4000-8000-000000000005";

let db: PGlite;

async function freshDb(preMigration?: string): Promise<PGlite> {
  const pg = new PGlite();
  await pg.exec(stub);
  if (preMigration) await pg.exec(preMigration);
  for (const m of migrations) await pg.exec(m);
  return pg;
}

/** Runs `fn` as an authenticated user (or anon when uid is null), in its own transaction. */
async function as<T>(uid: string | null, fn: (tx: Transaction) => Promise<T>, pg = db): Promise<T> {
  return pg.transaction(async (tx) => {
    await tx.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      uid ? JSON.stringify({ sub: uid, role: "authenticated" }) : "",
    ]);
    return fn(tx);
  });
}

/** Captures the SQLSTATE / message of a failing operation. */
async function failure(p: Promise<unknown>): Promise<{ code?: string; message: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as { code?: string; message: string };
    return { code: err.code, message: err.message };
  }
  throw new Error("expected the operation to fail");
}

type Row = Record<string, unknown>;
const one = async (tx: Transaction, sql: string, params: unknown[] = []) =>
  (await tx.query<Row>(sql, params)).rows[0]!;
const all = async (tx: Transaction, sql: string, params: unknown[] = []) =>
  (await tx.query<Row>(sql, params)).rows;

function action(tx: Transaction, board: string, id: string, body: object) {
  return one(tx, "select public.apply_board_action($1, $2, $3::jsonb) as r", [
    board,
    id,
    JSON.stringify(body),
  ]).then((r) => r.r as Row);
}

let workspace: string;
let board: string;
let todo: string;
let done: string;

beforeAll(async () => {
  db = await freshDb();
  for (const [id, name] of [
    [OWNER, "owner"],
    [MEMBER, "member"],
    [VIEWER, "viewer"],
    [OUTSIDER, "outsider"],
    [ADMIN, "admin"],
  ]) {
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      id,
      `${name}@example.test`,
      JSON.stringify(name === "owner" ? { display_name: "Olu Owner" } : {}),
    ]);
  }

  workspace = (await as(OWNER, (tx) => one(tx, "insert into public.workspaces (name) values ('Acme') returning id"))).id as string;
  await as(OWNER, async (tx) => {
    await tx.query("insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'admin')", [workspace, ADMIN]);
  });
  await as(ADMIN, async (tx) => {
    await tx.query(
      "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'member'), ($1, $3, 'viewer')",
      [workspace, MEMBER, VIEWER]
    );
  });
  board = (await as(MEMBER, (tx) => one(tx, "insert into public.boards (workspace_id, name) values ($1, 'Sprint') returning id", [workspace]))).id as string;
  todo = ((await as(MEMBER, (tx) => action(tx, board, "c-todo", { type: "add_column", title: "Todo", color: "#3B82F6" }))).row as Row).id as string;
  done = ((await as(MEMBER, (tx) => action(tx, board, "c-done", { type: "add_column", title: "Done", color: "#10B981" }))).row as Row).id as string;
});

describe("accounts and workspaces", () => {
  test("sign-up creates a profile, using the display name when given", async () => {
    const profiles = (await db.query<Row>("select id, display_name from public.profiles order by id")).rows;
    expect(profiles).toHaveLength(5);
    expect(profiles.find((p) => p.id === OWNER)?.display_name).toBe("Olu Owner");
    expect(profiles.find((p) => p.id === MEMBER)?.display_name).toBe("member");
  });

  test("the creator becomes owner and created_by can't be spoofed", async () => {
    const ws = await as(OUTSIDER, (tx) =>
      one(tx, "insert into public.workspaces (name, created_by) values ('Mine', $1) returning id, created_by", [OWNER])
    );
    expect(ws.created_by).toBe(OUTSIDER);
    const role = await as(OUTSIDER, (tx) =>
      one(tx, "select role from public.workspace_members where workspace_id = $1 and user_id = $2", [ws.id, OUTSIDER])
    );
    expect(role.role).toBe("owner");
  });

  test("outsiders can't see the workspace, its members, boards or cards", async () => {
    await as(OUTSIDER, async (tx) => {
      expect(await all(tx, "select * from public.workspaces where id = $1", [workspace])).toHaveLength(0);
      expect(await all(tx, "select * from public.workspace_members where workspace_id = $1", [workspace])).toHaveLength(0);
      expect(await all(tx, "select * from public.boards where id = $1", [board])).toHaveLength(0);
      expect(await all(tx, "select * from public.board_columns where board_id = $1", [board])).toHaveLength(0);
    });
  });

  test("anonymous callers have no table access at all", async () => {
    const err = await failure(as(null, (tx) => all(tx, "select * from public.boards")));
    expect(err.message).toMatch(/permission denied/);
  });

  test("only admins add members, and nobody can grant owner", async () => {
    const asMember = await failure(
      as(MEMBER, (tx) =>
        tx.query("insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'member')", [workspace, OUTSIDER])
      )
    );
    expect(asMember.message).toMatch(/row-level security/);

    const ownerGrant = await failure(
      as(ADMIN, (tx) =>
        tx.query("update public.workspace_members set role = 'owner' where workspace_id = $1 and user_id = $2", [workspace, MEMBER])
      )
    );
    expect(ownerGrant.message).toMatch(/row-level security/);
  });

  test("members can't move a membership row to another user", async () => {
    const err = await failure(
      as(ADMIN, (tx) =>
        tx.query("update public.workspace_members set user_id = $1 where workspace_id = $2 and user_id = $3", [OUTSIDER, workspace, VIEWER])
      )
    );
    expect(err.message).toMatch(/permission denied/);
  });

  test("role helpers aren't exposed as API functions and anon can't run them", async () => {
    const exposed = await db.query<Row>(
      "select proname from pg_proc where pronamespace = 'public'::regnamespace and prosecdef and proname in ('has_board_role','has_workspace_role','workspace_role_of','shares_workspace_with')"
    );
    expect(exposed.rows).toHaveLength(0);
    const err = await failure(as(null, (tx) => tx.query("select private.has_board_role($1, 'viewer')", [board])));
    expect(err.message).toMatch(/permission denied/);
  });

  test("profiles are visible only to people who share a workspace", async () => {
    await as(MEMBER, async (tx) => {
      expect(await all(tx, "select id from public.profiles where id = $1", [OWNER])).toHaveLength(1);
      expect(await all(tx, "select id from public.profiles where id = $1", [OUTSIDER])).toHaveLength(0);
    });
  });
});

describe("board permissions", () => {
  test("viewers can read but not write, through the RPC or directly", async () => {
    await as(VIEWER, async (tx) => {
      expect(await all(tx, "select id from public.board_columns where board_id = $1", [board])).toHaveLength(2);
    });
    const rpc = await failure(as(VIEWER, (tx) => action(tx, board, "v1", { type: "add_card", columnId: todo, title: "Nope" })));
    expect(rpc.code).toBe("PT403");
    const direct = await failure(
      as(VIEWER, (tx) =>
        tx.query("insert into public.cards (board_id, column_id, title, position) values ($1, $2, 'x', 1)", [board, todo])
      )
    );
    expect(direct.message).toMatch(/row-level security/);
  });

  test("outsiders get 403 from the RPC", async () => {
    const err = await failure(as(OUTSIDER, (tx) => action(tx, board, "o1", { type: "rename_board", name: "x", expectedVersion: 1 })));
    expect(err.code).toBe("PT403");
  });

  test("a card can't point at another board's column", async () => {
    const other = (await as(MEMBER, (tx) => one(tx, "insert into public.boards (workspace_id, name) values ($1, 'Other') returning id", [workspace]))).id as string;
    const err = await failure(
      as(MEMBER, (tx) => action(tx, other, "x-board", { type: "add_card", columnId: todo, title: "Smuggled" }))
    );
    expect(err.message).toMatch(/foreign key/);
  });
});

describe("actions, versions and conflicts", () => {
  test("add → move bumps the version and stamps the real actor", async () => {
    const added = await as(MEMBER, (tx) => action(tx, board, "a1", { type: "add_card", columnId: todo, title: "Ship it" }));
    expect(added.status).toBe("ok");
    const card = added.row as Row;
    expect(card.version).toBe(1);
    expect(card.created_by).toBe(MEMBER);

    const moved = await as(ADMIN, (tx) =>
      action(tx, board, "a2", { type: "move_card", id: card.id, expectedVersion: 1, columnId: done, position: 1 })
    );
    expect(moved.status).toBe("ok");
    expect((moved.row as Row).version).toBe(2);
    expect((moved.row as Row).column_id).toBe(done);
    expect((moved.row as Row).updated_by).toBe(ADMIN);
  });

  test("a stale expectedVersion is a conflict that returns the current row, not a lost update", async () => {
    const card = ((await as(MEMBER, (tx) => action(tx, board, "b1", { type: "add_card", columnId: todo, title: "Race" }))).row as Row);
    // Two clients both loaded version 1.
    const first = await as(MEMBER, (tx) =>
      action(tx, board, "b2", { type: "update_card", id: card.id, expectedVersion: 1, title: "Edited by A" })
    );
    const second = await as(ADMIN, (tx) =>
      action(tx, board, "b3", { type: "update_card", id: card.id, expectedVersion: 1, title: "Edited by B" })
    );
    expect(first.status).toBe("ok");
    expect(second.status).toBe("conflict");
    expect((second.current as Row).title).toBe("Edited by A");
    expect((second.current as Row).version).toBe(2);
  });

  test("direct PostgREST-style updates are version-checked too (409)", async () => {
    const card = ((await as(MEMBER, (tx) => action(tx, board, "d1", { type: "add_card", columnId: todo, title: "Direct" }))).row as Row);
    const stale = await failure(
      as(MEMBER, (tx) => tx.query("update public.cards set title = 'no version bump' where id = $1", [card.id]))
    );
    expect(stale.code).toBe("PT409");
    await as(MEMBER, (tx) => tx.query("update public.cards set title = 'ok', version = 2 where id = $1", [card.id]));
  });

  test("replaying the same clientActionId returns the stored result and creates nothing", async () => {
    const body = { type: "add_card", columnId: todo, title: "Exactly once" };
    const first = await as(MEMBER, (tx) => action(tx, board, "idem-1", body));
    const again = await as(MEMBER, (tx) => action(tx, board, "idem-1", body));
    expect(again.replayed).toBe(true);
    expect((again.row as Row).id).toBe((first.row as Row).id);
    const count = await as(MEMBER, (tx) => one(tx, "select count(*)::int as n from public.cards where title = 'Exactly once'"));
    expect(count.n).toBe(1);
  });

  test("client-generated ids are honoured (for offline-created cards)", async () => {
    const id = "11111111-2222-4333-8444-555555555555";
    const res = await as(MEMBER, (tx) => action(tx, board, "cid", { type: "add_card", id, columnId: todo, title: "Offline" }));
    expect((res.row as Row).id).toBe(id);
  });

  test("the last lane can't be deleted", async () => {
    const solo = (await as(MEMBER, (tx) => one(tx, "insert into public.boards (workspace_id, name) values ($1, 'Solo') returning id", [workspace]))).id as string;
    const col = (await as(MEMBER, (tx) => action(tx, solo, "s1", { type: "add_column", title: "Only", color: "#6366F1" }))).row as Row;
    const res = await as(MEMBER, (tx) => action(tx, solo, "s2", { type: "delete_column", id: col.id, expectedVersion: 1 }));
    expect(res).toMatchObject({ status: "rejected", reason: "last_column" });
  });

  test("assignees must belong to the workspace", async () => {
    const card = ((await as(MEMBER, (tx) => action(tx, board, "as1", { type: "add_card", columnId: todo, title: "Assign" }))).row as Row);
    const err = await failure(
      as(MEMBER, (tx) => action(tx, board, "as2", { type: "update_card", id: card.id, expectedVersion: 1, assigneeId: OUTSIDER }))
    );
    expect(err.code).toBe("PT400");
    const ok = await as(MEMBER, (tx) => action(tx, board, "as3", { type: "update_card", id: card.id, expectedVersion: 1, assigneeId: VIEWER }));
    expect(ok.status).toBe("ok");
  });
});

describe("activity and notifications", () => {
  test("activity records who did what, and a lane delete is one event", async () => {
    const lane = (await as(MEMBER, (tx) => action(tx, board, "l1", { type: "add_column", title: "Temp", color: "#F59E0B" }))).row as Row;
    await as(MEMBER, (tx) => action(tx, board, "l2", { type: "add_card", columnId: lane.id, title: "Inside" }));
    await as(MEMBER, (tx) => action(tx, board, "l3", { type: "add_card", columnId: lane.id, title: "Inside 2" }));
    await as(ADMIN, (tx) => action(tx, board, "l4", { type: "delete_column", id: lane.id, expectedVersion: 1 }));

    const events = await as(VIEWER, (tx) =>
      all(tx, "select entity, action, actor_id from public.activity_events where board_id = $1 and created_at >= now() - interval '1 minute' order by id", [board])
    );
    const tail = events.slice(-4);
    expect(tail.map((e) => `${e.entity}:${e.action}`)).toEqual([
      "column:created",
      "card:created",
      "card:created",
      "column:deleted",
    ]);
    expect(tail.at(-1)!.actor_id).toBe(ADMIN);
  });

  test("users can't write activity or create notifications", async () => {
    const a = await failure(
      as(MEMBER, (tx) =>
        tx.query("insert into public.activity_events (board_id, entity, entity_id, action) values ($1, 'card', gen_random_uuid(), 'created')", [board])
      )
    );
    expect(a.message).toMatch(/permission denied/);
    const n = await failure(
      as(MEMBER, (tx) => tx.query("insert into public.notifications (user_id, kind, board_id) values ($1, 'mention', $2)", [VIEWER, board]))
    );
    expect(n.message).toMatch(/permission denied/);
  });

  test("users can only mark their own notifications read, and only read_at", async () => {
    await db.query("insert into public.notifications (user_id, kind, board_id) values ($1, 'assigned', $2)", [VIEWER, board]);
    await as(VIEWER, (tx) => tx.query("update public.notifications set read_at = now() where user_id = $1", [VIEWER]));
    const other = await as(MEMBER, (tx) => all(tx, "select * from public.notifications where user_id = $1", [VIEWER]));
    expect(other).toHaveLength(0);
    const err = await failure(as(VIEWER, (tx) => tx.query("update public.notifications set kind = 'mention'")));
    expect(err.message).toMatch(/permission denied/);
  });
});

describe("legacy data", () => {
  test("the old JSON boards table is renamed, kept, and closed to clients", async () => {
    const legacy = `
      create table public.boards (id text primary key, columns jsonb, cards jsonb, board jsonb, updated_at timestamptz);
      alter table public.boards enable row level security;
      create policy "boards_public_select" on public.boards for select using (true);
      insert into public.boards values ('old-abc123', '[]', '[]', '{}', now());
    `;
    const pg = await freshDb(legacy);
    expect((await pg.query<Row>("select count(*)::int as n from public.legacy_boards")).rows[0]!.n).toBe(1);
    const err = await failure(as(OWNER, (tx) => all(tx, "select * from public.legacy_boards"), pg));
    expect(err.message).toMatch(/permission denied/);
  });
});
