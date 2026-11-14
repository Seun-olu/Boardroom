import { describe, expect, test, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: vi.fn() }));

const { safeNext } = await import("../auth");
const { friendlyDbError, fromZodError } = await import("../forms");

describe("safeNext (open-redirect guard)", () => {
  test.each([
    ["/w/123", "/w/123"],
    ["/invite/abc?x=1", "/invite/abc?x=1"],
  ])("keeps same-site path %s", (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });

  test.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "w"])(
    "falls back for %j",
    (raw) => {
      expect(safeNext(raw)).toBe("/w");
    }
  );
});

describe("friendlyDbError", () => {
  test("maps RLS and permission errors to a plain message", () => {
    expect(friendlyDbError({ code: "42501", message: "new row violates row-level security policy" }, "t")).toMatch(/permission/);
  });
  test("maps version conflicts and expired links", () => {
    expect(friendlyDbError({ code: "PT409" }, "t")).toMatch(/changed this first/);
    expect(friendlyDbError({ code: "PT404" }, "t")).toMatch(/invalid or has expired/);
  });
  test("never leaks unknown database messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const msg = friendlyDbError({ code: "XX000", message: "relation secret_table does not exist" }, "t");
    expect(msg).not.toMatch(/secret_table/);
    spy.mockRestore();
  });
});

test("fromZodError reports the first error per field", () => {
  const r = z.object({ email: z.string().email("bad email"), name: z.string().min(1, "need name") }).safeParse({ email: "x", name: "" });
  expect(r.success).toBe(false);
  if (!r.success) {
    const state = fromZodError(r.error);
    expect(state).toMatchObject({ status: "error", fieldErrors: { email: "bad email", name: "need name" } });
  }
});
