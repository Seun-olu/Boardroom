import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { getPublishableKey, getSupabaseUrl } from "./env";

/**
 * Refreshes the Supabase session cookie on every matched request and reports
 * who (if anyone) is signed in. Must return the same response object it wrote
 * cookies to, or the refreshed session is lost.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) return { response, userId: null as string | null };

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims() verifies the JWT (and refreshes it if expired) — unlike
  // getSession(), which trusts the cookie as-is.
  const { data } = await supabase.auth.getClaims();
  return { response, userId: (data?.claims?.sub as string | undefined) ?? null };
}
