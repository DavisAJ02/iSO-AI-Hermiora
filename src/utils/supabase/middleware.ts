import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safeNextPath";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const AUTH_FORM_PATHS = new Set([
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
]);

function forwardAuthCookies(from: NextResponse, to: NextResponse) {
  const headersWithGetSetCookie = from.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const list = headersWithGetSetCookie.getSetCookie?.() ?? [];
  for (const cookie of list) {
    to.headers.append("set-cookie", cookie);
  }
}

/**
 * Refreshes the Auth session in the Next.js proxy and enforces route access.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;

  const skipUnauthRedirect =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth/callback") ||
    /** MaishaPay returns users here before cookies always attach on cross-site redirect */
    pathname.startsWith("/billing") ||
    pathname === "/favicon.ico";

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<typeof supabaseResponse.cookies.set>[2];
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (AUTH_FORM_PATHS.has(pathname)) {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      const redirectRes = NextResponse.redirect(new URL(next, request.url));
      forwardAuthCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
    return supabaseResponse;
  }

  if (!skipUnauthRedirect && !pathname.startsWith("/auth")) {
    const signIn = new URL("/auth/sign-in", request.url);
    const returnTo = `${pathname}${request.nextUrl.search}`;
    signIn.searchParams.set("next", safeNextPath(returnTo));
    const redirectRes = NextResponse.redirect(signIn);
    forwardAuthCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  return supabaseResponse;
}
