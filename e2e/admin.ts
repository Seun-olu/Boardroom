import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Same file `next dev` uses, so tests only ever touch boardroom-dev.
config({ path: ".env.development.local", quiet: true });

const DEV_PROJECT = "fzpmryinaeslneptnrox";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("e2e needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.development.local");
  if (!url.includes(DEV_PROJECT)) throw new Error(`Refusing to run e2e against ${url}: not the boardroom-dev project`);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const RUN_ID = process.env.E2E_RUN_ID ?? randomBytes(4).toString("hex");

export function testUser(label: string) {
  return {
    email: `e2e-${RUN_ID}-${label}@example.test`,
    password: `pw-${randomBytes(12).toString("base64url")}`,
    name: `E2E ${label[0]!.toUpperCase()}${label.slice(1)}`,
  };
}
