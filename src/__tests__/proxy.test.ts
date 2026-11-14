import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/lib/supabase/proxy-session", () => ({
  updateSession: vi.fn(async () => ({ response: NextResponse.next(), userId: session.userId })),
}));

const { proxy } = await import("../proxy");
const run = (path: string) => proxy(new NextRequest(new URL(path, "http://localhost:3002")));

beforeEach(() => {
  session.userId = null;
});

describe("proxy", () => {
  test.each(["/w", "/w/abc/members", "/account", "/invite/" + "a".repeat(64)])(
    "redirects signed-out visitors from %s to sign-in with a return path",
    async (path) => {
      const res = await run(path);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("next")).toBe(path);
    }
  );

  test("lets signed-out visitors see public pages", async () => {
    for (const path of ["/", "/sign-in", "/sign-up"]) {
      expect((await run(path)).headers.get("location")).toBeNull();
    }
  });

  test("sends signed-in users away from sign-in/sign-up", async () => {
    session.userId = "u1";
    const res = await run("/sign-in");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/w");
  });

  test("lets signed-in users into the app", async () => {
    session.userId = "u1";
    expect((await run("/w")).headers.get("location")).toBeNull();
  });

  test("forwards email-link codes on the root to the callback", async () => {
    const res = await run("/?code=abc123");
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("code")).toBe("abc123");
  });
});
