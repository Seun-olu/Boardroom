import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublishableKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

let browserClient: SupabaseClient | null = null;

export { isSupabaseConfigured };

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getPublishableKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY)"
    );
  }

  if (!browserClient) {
    browserClient = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }

  return browserClient;
}
