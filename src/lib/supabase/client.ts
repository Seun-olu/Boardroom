import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getPublishableKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

let browserClient: SupabaseClient<Database> | null = null;

export { isSupabaseConfigured };

/**
 * Browser client. Uses cookie-based sessions (via @supabase/ssr) so the
 * server, proxy and browser all see the same signed-in user.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  browserClient ??= createBrowserClient<Database>(url, key, {
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return browserClient;
}
