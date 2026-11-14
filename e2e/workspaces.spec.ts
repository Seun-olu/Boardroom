import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminClient } from "./admin";

type User = { email: string; password: string; name: string };
const users = () => JSON.parse(process.env.E2E_USERS!) as { alice: User; bob: User };

async function signIn(page: Page, u: User, next?: string) {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function newSession(browser: Browser, u: User) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, u);
  await expect(page).toHaveURL(/\/w$/);
  return { context, page };
}

test.describe.configure({ mode: "serial" });

test("signed-out visitors are sent to sign-in and returned afterwards", async ({ page }) => {
  await page.goto("/w");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fw$/);
  await page.getByLabel("Email").fill(users().alice.email);
  await page.getByLabel("Password").fill(users().alice.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/w$/);
  await expect(page.getByRole("heading", { name: "Workspaces" })).toBeVisible();
});

test("wrong password shows one generic error", async ({ page }) => {
  await signIn(page, { ...users().alice, password: "definitely-wrong" });
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect" })).toHaveText("Incorrect email or password.");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("sign-up validates on the server before calling Supabase", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Someone");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
});

test("owner creates a workspace and board, invites a viewer, then manages their role", async ({ browser }) => {
  const { alice, bob } = users();
  const a = await newSession(browser, alice);

  // Workspace + board with starter lanes.
  await a.page.getByLabel("Workspace name").fill("E2E Team");
  await a.page.getByRole("button", { name: "Create workspace" }).click();
  await expect(a.page.getByRole("heading", { name: "E2E Team" })).toBeVisible();
  await expect(a.page.getByText("You are owner")).toBeVisible();
  const workspaceUrl = a.page.url();

  await a.page.getByLabel("New board").fill("Sprint 1");
  await a.page.getByRole("button", { name: "Create board" }).click();
  const boards = a.page.getByRole("list", { name: "Boards" });
  await expect(boards.getByRole("heading", { name: "Sprint 1" })).toBeVisible();
  await expect(boards.getByText(/3 lanes · 0 cards/)).toBeVisible();

  // Invite Bob as a viewer.
  await a.page.getByRole("link", { name: "Members" }).click();
  await a.page.getByLabel("Email").fill(bob.email.toUpperCase());
  await a.page.getByLabel("Role", { exact: true }).selectOption("viewer");
  await a.page.getByRole("button", { name: "Create invite" }).click();
  await expect(a.page.getByRole("list", { name: "Open invites" }).getByText(bob.email)).toBeVisible();

  // The link is copied from the UI in real use; read the token server-side here.
  const { data: invite } = await adminClient().from("workspace_invites").select("token").eq("email", bob.email).single();
  expect(invite?.token).toMatch(/^[0-9a-f]{64}$/);

  // Bob, signed out, follows the link → sign in → back to the invite → accept.
  const bobContext = await browser.newContext();
  const b = await bobContext.newPage();
  await b.goto(`/invite/${invite!.token}`);
  await expect(b).toHaveURL(/\/sign-in\?next=%2Finvite%2F/);
  await b.getByLabel("Email").fill(bob.email);
  await b.getByLabel("Password").fill(bob.password);
  await b.getByRole("button", { name: "Sign in" }).click();
  await expect(b.getByRole("heading", { name: "Join E2E Team" })).toBeVisible();
  await b.getByRole("button", { name: "Accept invite" }).click();
  await expect(b).toHaveURL(workspaceUrl);
  await expect(b.getByText("You are viewer")).toBeVisible();

  // Viewers see boards but no create/rename/delete controls.
  await expect(b.getByRole("heading", { name: "Sprint 1" })).toBeVisible();
  await expect(b.getByRole("button", { name: "Create board" })).toHaveCount(0);
  await expect(b.getByRole("button", { name: "Rename" })).toHaveCount(0);

  // Owner promotes Bob to member → Bob can now create boards.
  await a.page.reload();
  const bobRow = a.page.getByRole("form", { name: `Role for ${bob.name}` });
  await bobRow.getByLabel(`Role for ${bob.name}`).selectOption("member");
  await bobRow.getByRole("button", { name: "Save" }).click();
  await expect(a.page.getByText("Role updated.")).toBeVisible();
  await b.reload();
  await expect(b.getByText("You are member")).toBeVisible();
  await expect(b.getByRole("button", { name: "Create board" })).toBeVisible();

  // Owner removes Bob → Bob gets a 404 for the workspace.
  await a.page.getByRole("button", { name: "Remove" }).click();
  await a.page.getByRole("button", { name: "Confirm remove" }).click();
  await expect(a.page.getByText("Member removed.")).toBeVisible();
  const res = await b.goto(workspaceUrl);
  expect(res?.status()).toBe(404);

  await bobContext.close();
  await a.context.close();
});

test("an invite link can't be used by a different signed-in account", async ({ browser }) => {
  const { alice, bob } = users();
  const admin = adminClient();
  const a = await newSession(browser, alice);
  await a.page.getByRole("link", { name: "E2E Team" }).click();
  await a.page.getByRole("link", { name: "Members" }).click();
  await a.page.getByLabel("Email").fill("someone-else@example.test");
  await a.page.getByRole("button", { name: "Create invite" }).click();
  await expect(a.page.getByRole("list", { name: "Open invites" }).getByText("someone-else@example.test")).toBeVisible();
  const { data: invite } = await admin.from("workspace_invites").select("token").eq("email", "someone-else@example.test").single();

  const b = await newSession(browser, bob);
  await b.page.goto(`/invite/${invite!.token}`);
  await expect(b.page.getByRole("alert").filter({ hasText: "different email" })).toBeVisible();
  await expect(b.page.getByRole("button", { name: "Accept invite" })).toHaveCount(0);

  await b.context.close();
  await a.context.close();
});

test("account: profile name updates the header, sign-out ends the session", async ({ browser }) => {
  const { alice } = users();
  const a = await newSession(browser, alice);
  await a.page.goto("/account");
  await a.page.getByLabel("Display name").fill("Alice Renamed");
  await a.page.getByRole("button", { name: "Save profile" }).click();
  await expect(a.page.getByText("Profile saved.")).toBeVisible();
  await expect(a.page.getByRole("navigation", { name: "Account" })).toContainText("Alice Renamed");

  await a.page.getByRole("button", { name: "Sign out" }).click();
  await expect(a.page).toHaveURL(/\/sign-in$/);
  await a.page.goto("/w");
  await expect(a.page).toHaveURL(/\/sign-in\?next=/);
  await a.context.close();
});
