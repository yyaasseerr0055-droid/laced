import { setLang } from "@/app/actions";
import { getT } from "@/lib/i18n";

export default async function LangToggle() {
  const { lang, t } = await getT();
  return (
    <form action={setLang}>
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <button
        type="submit"
        className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-foreground"
      >
        {t("switchLanguage")}
      </button>
    </form>
  );
}
