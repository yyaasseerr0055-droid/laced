import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n";
import { signOut } from "@/app/actions";
import LangToggle from "@/components/LangToggle";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const { t } = await getT();

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-accent" aria-hidden />
            <span className="text-lg font-bold">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
              >
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
    </>
  );
}
