import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type CookieStore = Awaited<ReturnType<typeof cookies>>;

/**
 * Server Components, Server Actions, Route Handlers — pass `await cookies()`.
 * Optional `authorizationHeader`: pass `request.headers.get("Authorization")` so
 * Route Handlers see the same user as the browser client when cookies are missing.
 */
export const createClient = (
  cookieStore: CookieStore,
  authorizationHeader?: string | null,
) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  const auth = authorizationHeader?.trim();
  return createServerClient(supabaseUrl, supabaseKey, {
    ...(auth ? { global: { headers: { Authorization: auth } } } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<CookieStore["set"]>[2];
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component — session refresh happens in middleware */
        }
      },
    },
  });
};
