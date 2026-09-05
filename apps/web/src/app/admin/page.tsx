import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getActiveSettings } from "@/lib/settings-service";
import { getAnalyticsSnapshot } from "@/lib/analytics-service";
import { AdminTabs } from "./AdminTabs";
import { DEFAULT_GENERATOR_SETTINGS } from "@/lib/generator-settings-schema";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  const currentUser = user!;
  if (currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const active = await getActiveSettings().catch(() => ({
    version: 0,
    createdAt: new Date(0),
    payload: DEFAULT_GENERATOR_SETTINGS
  }));
  const analytics = await getAnalyticsSnapshot(30).catch(() => ({
    days: 30,
    filters: {
      generator: "all",
      eventType: "all",
      variantId: "all",
      from: null,
      to: null,
      limit: 100
    },
    totalEvents: 0,
    uniqueVisitors: 0,
    opens: 0,
    downloadClicks: 0,
    successfulDownloads: 0,
    failedDownloads: 0,
    conversionRatePercent: 0,
    avgBoxesPerLayoutDownload: 0,
    generatorUsage: [],
    eventTypes: [],
    topVariants: [],
    topBoxSizes: [],
    dailySeries: [],
    availableGenerators: [],
    availableEventTypes: [],
    availableVariants: [],
    recentEvents: []
  }));
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] w-full mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("admin.title")}</h1>
          <p className="text-sm text-neutral-400">
            {t("admin.activeVersion", {
              version: active.version,
              createdAt: new Date(active.createdAt).toISOString().slice(0, 19) + "Z"
            })}
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="text-sm underline text-neutral-300" type="submit">
            {t("admin.logout")}
          </button>
        </form>
      </header>

      <section className="border border-neutral-800 rounded-md p-4">
        <h2 className="font-semibold mb-2">{t("admin.constantsTitle")}</h2>
        <ul className="text-sm text-neutral-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1">
          <li>{t("admin.constant.basePlate")}</li>
          <li>{t("admin.constant.grid10x10")}</li>
          <li>{t("admin.constant.pitch")}</li>
          <li>{t("admin.constant.pickupShape")}</li>
          <li>{t("admin.constant.pickupPosition")}</li>
          <li>{t("admin.constant.orientation")}</li>
        </ul>
        <p className="text-xs text-neutral-500 mt-2">{t("admin.constantsHint")}</p>
      </section>

      <AdminTabs current={active.payload} analytics={analytics} />
    </div>
  );
}
