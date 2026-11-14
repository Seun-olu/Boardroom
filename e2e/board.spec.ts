import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminClient } from "./admin";

type User = { email: string; password: string; name: string };
const users = () => JSON.parse(process.env.E2E_USERS!) as { alice: User; bob: User };

async function session(browser: Browser, u: User) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/w$/);
  return { context, page };
}

/** Adds a card to the first lane (Todo on a starter board). */
async function addCard(page: Page, title: string) {
  await page.getByRole("button", { name: "+ Add card" }).first().click();
  await page.getByPlaceholder("What needs to be done?").fill(title);
  await page.getByRole("button", { name: "Create card" }).click();
}

test("two members edit one board live, and an offline edit syncs on reconnect", async ({ browser }) => {
  const { alice, bob } = users();
  const a = await session(browser, alice);

  await a.page.getByLabel("Workspace name").fill("Board E2E");
  await a.page.getByRole("button", { name: "Create workspace" }).click();
  await expect(a.page.getByRole("heading", { name: "Board E2E" })).toBeVisible();
  const workspaceId = a.page.url().split("/w/")[1]!;

  await a.page.getByLabel("New board").fill("Live board");
  await a.page.getByRole("button", { name: "Create board" }).click();
  await a.page.getByRole("link", { name: "Live board" }).click();
  await expect(a.page.getByRole("button", { name: "Live board" })).toBeVisible();
  await expect(a.page.getByText("Live", { exact: true })).toBeVisible();
  const boardUrl = a.page.url();

  // Bob joins the workspace as a member (invite flow is covered elsewhere).
  const admin = adminClient();
  const { data: bobUser } = await admin.auth.admin.listUsers({ perPage: 200 });
  const bobId = bobUser!.users.find((u) => u.email === bob.email)!.id;
  await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: bobId, role: "member" });

  const b = await session(browser, bob);
  await b.page.goto(boardUrl);
  await expect(b.page.getByText("Live", { exact: true })).toBeVisible();

  // Alice adds a card → Bob sees it without reloading.
  await addCard(a.page, "Write release notes");
  await expect(b.page.getByText("Write release notes")).toBeVisible();

  // It persisted (fresh load shows it).
  await a.page.reload();
  await expect(a.page.getByText("Write release notes")).toBeVisible();

  // Bob goes offline, adds a card: it's kept locally and queued.
  await b.context.setOffline(true);
  await b.page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await addCard(b.page, "Drafted on a plane");
  await expect(b.page.getByText("Drafted on a plane")).toBeVisible();
  await expect(a.page.getByText("Drafted on a plane")).toHaveCount(0);

  // Back online: the queued action syncs and Alice sees it live.
  await b.context.setOffline(false);
  await b.page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(a.page.getByText("Drafted on a plane")).toBeVisible({ timeout: 20_000 });

  // Exactly one copy exists (idempotent replay).
  const { count } = await admin.from("cards").select("id", { count: "exact", head: true }).eq("title", "Drafted on a plane");
  expect(count).toBe(1);

  await b.context.close();
  await a.context.close();
});
