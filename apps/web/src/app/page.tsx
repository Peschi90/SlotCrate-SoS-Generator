import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function HomePage() {
  const t = await getTranslations();
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">{t("home.title")}</h1>
      <ul className="space-y-3 text-neutral-200">
        <li>
          <Link className="underline hover:text-white" href="/generator">
            {t("home.generator.title")}
          </Link>
          <div className="text-sm text-neutral-400">{t("home.generator.description")}</div>
        </li>
        <li>
          <Link className="underline hover:text-white" href="/planner">
            {t("home.planner.title")}
          </Link>
          <div className="text-sm text-neutral-400">{t("home.planner.description")}</div>
        </li>
      </ul>
    </div>
  );
}
