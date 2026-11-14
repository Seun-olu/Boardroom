import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { getPublishableKey, getSupabaseUrl } from "./env";

/**
 * Per-request server client acting as the signed-in user (publishable key +
 * the user's session cookie). Every query it makes is subject to RLS — this
 * is the client all app code should use. The secret key is never used on the
 * request path.
 */
export async function createSupabaseServerClient() {
  // Read cookies first: it marks the route as per-request, so builds without
  // Supabase env (e.g. CI) never try to pre-render signed-in pages.
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) throw new Error("Supabase is not configured");

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
