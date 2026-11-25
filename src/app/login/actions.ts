"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) redirect("/login?error=wrong");

  if (!isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    redirect("/login?error=notadmin");
  }

  redirect("/admin");
}
