/** Supabase env — supports new (sb_publishable / sb_secret) and legacy (anon / service_role) keys. */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Browser-safe key */
export function getPublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Server-only key — bypasses RLS */
export function getSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getPublishableKey());
}

export function decodeJwtRole(key: string): string | null {
  if (!key.startsWith("eyJ")) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")
    ) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function describeKey(key: string): string {
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  const role = decodeJwtRole(key);
  if (role) return `legacy JWT (${role})`;
  return "unknown";
}

export function validateSecretKey(secretKey: string, publishableKey?: string): void {
  if (publishableKey && secretKey === publishableKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is identical to your publishable key. Copy the sb_secret_... key from Supabase → Settings → API Keys (eye icon on Secret keys)."
    );
  }

  const role = decodeJwtRole(secretKey);
  if (role === "anon") {
    throw new Error(
      "Server key has role 'anon' — you pasted the publishable/anon key twice. Use sb_secret_... or the service_role JWT from the Legacy tab."
    );
  }
}
