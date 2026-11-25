import { createServiceClient } from "@/lib/supabase";

// Temporary diagnostic: shows which settings exist and whether the database answers.
// It never returns any secret value. Remove once the app is confirmed working.
export const dynamic = "force-dynamic";

function describeKey(value: string | undefined) {
  if (!value) return "missing";
  if (value !== value.trim()) return "has spaces at the start or end";
  if (value.startsWith("sb_secret_")) return "ok (sb_secret format)";
  if (value.startsWith("eyJ")) return "ok (service_role format)";
  if (value.startsWith("sb_publishable_"))
    return "WRONG: this is the publishable key, not the secret key";
  return "unexpected format";
}

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const settings = {
    SUPABASE_URL: !url
      ? "missing"
      : url !== url.trim()
        ? "has spaces at the start or end"
        : /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)
          ? "ok"
          : "unexpected format (should look like https://xxxx.supabase.co, no slash at the end)",
    SUPABASE_PUBLISHABLE_KEY: !publishable
      ? "missing"
      : publishable !== publishable.trim()
        ? "has spaces at the start or end"
        : publishable.startsWith("sb_publishable_") || publishable.startsWith("eyJ")
          ? "ok"
          : "unexpected format",
    ADMIN_EMAIL: !adminEmail
      ? "missing"
      : adminEmail !== adminEmail.trim()
        ? "has spaces at the start or end"
        : adminEmail.includes("@")
          ? "ok"
          : "unexpected format",
    SUPABASE_SERVICE_ROLE_KEY: describeKey(service),
  };

  let database = "not tested";
  if (url && service) {
    try {
      const { error, count } = await createServiceClient()
        .from("reasons")
        .select("id", { count: "exact", head: true });
      database = error ? `error: ${error.message}` : `ok (${count} reasons found)`;
    } catch (e) {
      database = `error: ${e instanceof Error ? e.message : "unknown"}`;
    }
  }

  // Both of these are public values, so showing their start is safe. JSON shows
  // hidden problems such as stray quote marks or line breaks.
  const look = {
    SUPABASE_URL: url === undefined ? "missing" : { text: url, length: url.length },
    SUPABASE_PUBLISHABLE_KEY:
      publishable === undefined
        ? "missing"
        : { starts: publishable.slice(0, 15), length: publishable.length },
    SUPABASE_SERVICE_ROLE_KEY: service === undefined ? "missing" : { length: service.length },
  };

  return Response.json({ version: "check v2", settings, look, database });
}
