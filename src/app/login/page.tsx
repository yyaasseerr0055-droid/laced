import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n";
import { getAdmin } from "@/lib/admin";
import LangToggle from "@/components/LangToggle";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getAdmin()) redirect("/admin");

  const { t } = await getT();
  const { error } = await searchParams;
  const message =
    error === "wrong" ? t("wrongLogin") : error === "notadmin" ? t("notAdmin") : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="mb-6 self-end">
        <LangToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden />
          <h1 className="text-2xl font-bold">{t("appName")}</h1>
        </div>

        <form action={signIn} className="space-y-4">
          <h2 className="text-lg font-semibold">{t("signInTitle")}</h2>

          {message && (
            <p role="alert" className="rounded-xl border border-accent px-4 py-3 text-sm text-accent">
              {message}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-muted">{t("email")}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              dir="ltr"
              className="w-full rounded-xl border border-line px-4 py-3 text-base outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">{t("password")}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              dir="ltr"
              className="w-full rounded-xl border border-line px-4 py-3 text-base outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-foreground px-4 py-4 text-base font-semibold text-background hover:bg-accent"
          >
            {t("signInButton")}
          </button>
        </form>
      </div>
    </main>
  );
}
