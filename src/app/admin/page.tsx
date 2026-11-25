import { createServiceClient } from "@/lib/supabase";
import { getT, STATUSES, type Key } from "@/lib/i18n";

type Counts = { byStatus: Record<string, number>; unreadAlerts: number };

async function loadCounts(): Promise<{ counts?: Counts; error?: string }> {
  try {
    const db = createServiceClient();
    const [statusResults, alertsResult] = await Promise.all([
      Promise.all(
        STATUSES.map((status) =>
          db
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", status),
        ),
      ),
      db
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
    ]);

    const failed = [...statusResults, alertsResult].find((r) => r.error);
    if (failed?.error) return { error: failed.error.message };

    const byStatus: Record<string, number> = {};
    STATUSES.forEach((status, i) => {
      byStatus[status] = statusResults[i].count ?? 0;
    });
    return { counts: { byStatus, unreadAlerts: alertsResult.count ?? 0 } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

const NEEDS_ATTENTION = new Set(["failed", "returned", "unavailable"]);

export default async function AdminPage() {
  const { t } = await getT();
  const { counts, error } = await loadCounts();

  if (!counts) {
    return (
      <div role="alert" className="rounded-2xl border border-accent p-5">
        <p className="font-semibold text-accent">{t("dbError")}</p>
        <p className="mt-1 text-sm">{t("dbErrorHint")}</p>
        <p dir="ltr" className="mt-3 text-xs text-muted">
          {error}
        </p>
      </div>
    );
  }

  const total = Object.values(counts.byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden />
          {t("dbOk")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-muted">{t("totalOrders")}</p>
          <p className="mt-1 text-4xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-muted">{t("unreadAlerts")}</p>
          <p className="mt-1 text-4xl font-bold">{counts.unreadAlerts}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("ordersByStatus")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUSES.map((status) => (
            <div
              key={status}
              className={`rounded-2xl border border-line p-4 ${
                NEEDS_ATTENTION.has(status) && counts.byStatus[status] > 0
                  ? "border-s-4 border-s-accent"
                  : ""
              }`}
            >
              <p className="text-sm text-muted">{t(`status_${status}` as Key)}</p>
              <p className="mt-1 text-3xl font-bold">{counts.byStatus[status]}</p>
            </div>
          ))}
        </div>
      </section>

      {total === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-semibold">{t("noOrdersYet")}</p>
          <p className="mt-1 text-sm text-muted">{t("noOrdersHint")}</p>
        </div>
      )}
    </div>
  );
}
