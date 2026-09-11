import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 *
 * Two auth transports are supported:
 *
 *  1. Cookies (default) — the Next.js web app, via @supabase/ssr.
 *  2. `Authorization: Bearer <access_token>` — the React Native app in /mobile,
 *     which has no cookies. The JWT is forwarded to PostgREST (so RLS applies to
 *     that user) and `auth.getUser()` / `auth.getSession()` resolve the same user
 *     so every existing route works unchanged.
 *
 * The Bearer path is only taken when the header is present AND no Supabase auth
 * cookie exists, so a browser session always wins.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const bearer = await readBearerToken();
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (bearer && !hasAuthCookie) {
    return createBearerClient(bearer);
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

async function readBearerToken(): Promise<string | null> {
  try {
    const h = await headers();
    const auth = h.get("authorization") ?? h.get("Authorization");
    if (!auth) return null;
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    const token = m?.[1]?.trim();
    // Reject obviously-not-a-JWT values (e.g. someone sending the publishable key).
    if (!token || token.split(".").length !== 3) return null;
    return token;
  } catch {
    // headers() is unavailable in some contexts (e.g. during static generation).
    return null;
  }
}

/**
 * Stateless client bound to a caller-supplied access token.
 *
 * supabase-js resolves `auth.getUser()` from its own storage, which is empty here,
 * so we shadow `getUser`/`getSession` on this instance to use the Bearer JWT.
 * `getUser(jwt)` verifies the token against GoTrue server-side — a forged or
 * expired token yields `user: null`, exactly like a bad cookie would.
 */
function createBearerClient(token: string): SupabaseClient {
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );

  const originalGetUser = client.auth.getUser.bind(client.auth);

  client.auth.getUser = ((jwt?: string) => originalGetUser(jwt ?? token)) as typeof client.auth.getUser;

  client.auth.getSession = (async () => {
    const { data, error } = await originalGetUser(token);
    if (error || !data.user) {
      return { data: { session: null }, error };
    }
    const session: Session = {
      access_token: token,
      refresh_token: "",
      token_type: "bearer",
      expires_in: 0,
      expires_at: decodeExp(token),
      user: data.user,
    };
    return { data: { session }, error: null };
  }) as typeof client.auth.getSession;

  return client;
}

function decodeExp(jwt: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}
