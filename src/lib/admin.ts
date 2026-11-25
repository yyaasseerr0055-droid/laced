import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase";

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}

/** Returns the signed-in admin, or null. */
export async function getAdmin() {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  return isAdminEmail(data.user?.email) ? data.user : null;
}

/** Use at the top of every admin page and admin action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}
