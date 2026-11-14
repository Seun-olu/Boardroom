import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

/** Routes that need a signed-in user. Pages re-check on the server; this is the fast path. */
const PROTECTED = [/^\/w(\/|$)/, /^\/invite\//, /^\/account(\/|$)/];
/** Auth pages a signed-in user has no reason to see. */
const AUTH_ONLY = [/^\/sign-in$/, /^\/sign-up$/];

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // Supabase email links land on the Site URL with ?code=…; finish the
  // exchange in the callback route.
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const { response, userId } = await updateSession(request);

  if (!userId && PROTECTED.some((r) => r.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (userId && AUTH_ONLY.some((r) => r.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/w";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets and the legacy board API (it has its own validation).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|manifest.webmanifest|api/board).*)"],
};
