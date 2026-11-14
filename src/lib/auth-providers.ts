import "server-only";
import { getPublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Whether Google sign-in is enabled for this Supabase project, read from the
 * public Auth settings endpoint (cached for 5 minutes). The button only shows
 * when the provider is actually configured.
 */
export async function isGoogleEnabled(): Promise<boolean> {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, next: { revalidate: 300 } });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
