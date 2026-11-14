import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { beforeAll, describe, expect, test } from "vitest";

const dir = join(__dirname, "..");
const stub = readFileSync(join(__dirname, "supabase-stub.sql"), "utf8");
const migrations = readdirSync(join(dir, "migrations")).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join(dir, "migrations", f), "utf8"));

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const INVITEE = "00000000-0000-4000-8000-0000000000a2";
const STRANGER = "00000000-0000-4000-8000-0000000000a3";
const UNCONFIRMED = "00000000-0000-4000-8000-0000000000a4";
const MEMBER = "00000000-0000-4000-8000-0000000000a5";

type Row = Record<string, unknown>;
let db: PGlite;
let ws: string;

async function as<T>(uid: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid })]);
    return fn(tx);
  });
}
async function failure(p: Promise<unknown>) {
  try { await p; } catch (e) { return e as { code?: string; message: string }; }
  throw new Error("expected failure");
}
const invite = (email: string, role = "member") =>
  as(ADMIN, async (tx) =>
    (await tx.query<Row>("insert into public.workspace_invites (workspace_id, email, role) values ($1, $2, $3) returning token, email", [ws, email, role])).rows[0]!
  );
const accept = (uid: string, token: unknown) =>
  as(uid, async (tx) => (await tx.query<Row>("select public.accept_workspace_invite($1) as ws", [token])).rows[0]!.ws);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(stub);
  for (const m of migrations) await db.exec(m);
  await db.query(
    `insert into auth.users (id, email, email_confirmed_at) values
     ($1, 'admin@example.test', now()), ($2, 'Invitee@Example.test', now()), ($3, 'stranger@example.test', now()),
     ($4, 'pending@example.test', null), ($5, 'member@example.test', now())`,
    [ADMIN, INVITEE, STRANGER, UNCONFIRMED, MEMBER]
  );
  ws = (await as(ADMIN, async (tx) => (await tx.query<Row>("insert into public.workspaces (name) values ('Team') returning id")).rows[0]!.id)) as string;
  await as(ADMIN, (tx) => tx.query("insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'member')", [ws, MEMBER]));
});

describe("workspace invites", () => {
  test("emails are normalised and the inviter is stamped", async () => {
    const inv = await invite("  INVITEE@example.test ");
    expect(inv.email).toBe("invitee@example.test");
    const row = await as(ADMIN, async (tx) => (await tx.query<Row>("select invited_by from public.workspace_invites where token = $1", [inv.token])).rows[0]!);
    expect(row.invited_by).toBe(ADMIN);
  });

  test("only admins can invite, see or revoke invites; nobody can invite an owner", async () => {
    const e1 = await failure(as(MEMBER, (tx) => tx.query("insert into public.workspace_invites (workspace_id, email) values ($1, 'x@example.test')", [ws])));
    expect(e1.message).toMatch(/row-level security/);
    const seen = await as(MEMBER, async (tx) => (await tx.query("select * from public.workspace_invites")).rows);
    expect(seen).toHaveLength(0);
    const e2 = await failure(invite("boss@example.test", "owner"));
    expect(e2.message).toMatch(/check constraint|row-level security/);
  });

  test("a stranger with the link can't accept someone else's invite", async () => {
    const inv = await invite("target@example.test");
    const err = await failure(accept(STRANGER, inv.token));
    expect(err.code).toBe("PT403");
  });

  test("an unconfirmed account can't accept, even with a matching email", async () => {
    const inv = await invite("pending@example.test");
    const err = await failure(accept(UNCONFIRMED, inv.token));
    expect(err.code).toBe("PT403");
  });

  test("the right user joins with the invited role, case-insensitively, and the link is then spent", async () => {
    const inv = await as(ADMIN, async (tx) =>
      (await tx.query<Row>("select token from public.workspace_invites where email = 'invitee@example.test'")).rows[0]!
    );
    const preview = await as(INVITEE, async (tx) => (await tx.query<Row>("select * from public.get_workspace_invite($1)", [inv.token])).rows[0]!);
    expect(preview).toMatchObject({ workspace_name: "Team", role: "member", email_matches: true, expired: false, accepted: false });

    expect(await accept(INVITEE, inv.token)).toBe(ws);
    const role = await as(INVITEE, async (tx) => (await tx.query<Row>("select role from public.workspace_members where workspace_id = $1 and user_id = $2", [ws, INVITEE])).rows[0]!);
    expect(role.role).toBe("member");

    const again = await failure(accept(INVITEE, inv.token));
    expect(again.code).toBe("PT404");
  });

  test("expired invites are rejected", async () => {
    const inv = await invite("late@example.test");
    await db.query("update public.workspace_invites set expires_at = now() - interval '1 minute' where token = $1", [inv.token]);
    await db.query("update auth.users set email = 'late@example.test' where id = $1", [STRANGER]);
    const err = await failure(accept(STRANGER, inv.token));
    expect(err.code).toBe("PT404");
  });

  test("accepting never downgrades an existing member", async () => {
    await as(ADMIN, (tx) => tx.query("update public.workspace_members set role = 'admin' where workspace_id = $1 and user_id = $2", [ws, MEMBER]));
    const inv = await invite("member@example.test", "viewer");
    await accept(MEMBER, inv.token);
    const role = await as(MEMBER, async (tx) => (await tx.query<Row>("select role from public.workspace_members where workspace_id = $1 and user_id = $2", [ws, MEMBER])).rows[0]!);
    expect(role.role).toBe("admin");
  });

  test("invite previews reveal nothing for unknown tokens", async () => {
    const rows = await as(STRANGER, async (tx) => (await tx.query("select * from public.get_workspace_invite('nope')")).rows);
    expect(rows).toHaveLength(0);
  });
});
