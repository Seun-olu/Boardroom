import { adminClient } from "./admin";

/** Removes everything this run created: workspaces it owns, then the users. */
export default async function globalTeardown() {
  const runId = process.env.E2E_RUN_ID;
  if (!runId) return;
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const mine = (data?.users ?? []).filter((u) => u.email?.startsWith(`e2e-${runId}-`));
  const ids = mine.map((u) => u.id);
  if (ids.length) {
    await admin.from("workspaces").delete().in("created_by", ids);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
}
