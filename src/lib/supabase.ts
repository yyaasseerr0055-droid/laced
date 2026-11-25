import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing setting: ${name}`);
  return value;
}

/** Used only for signing the admin in and checking who is signed in. */
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    need("SUPABASE_URL"),
    need("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a page (read-only); safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Full database access. Runs ONLY on the server and must never be sent to the
 * browser. Every use must come after the admin (or courier) has been checked.
 */
export function createServiceClient() {
  return createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
