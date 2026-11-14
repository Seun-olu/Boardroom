import { expect, test } from "vitest";
import { GET, POST } from "../route";

test("the retired anonymous board API answers 410 Gone and touches nothing", async () => {
  for (const handler of [GET, POST]) {
    const res = handler();
    expect(res.status).toBe(410);
    expect((await res.json()).error).toMatch(/retired/);
  }
});
