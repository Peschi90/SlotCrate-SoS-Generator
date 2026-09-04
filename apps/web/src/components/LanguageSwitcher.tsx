import { setLocaleAction } from "@/i18n/actions";
import { LOCALES, type Locale } from "@/i18n/request";

export function LanguageSwitcher({ current }: { current: Locale }) {
  return (
    <div className="ml-auto flex gap-1 rounded-full border border-white/20 bg-black/40 p-1 text-xs backdrop-blur">
      {LOCALES.map((code) => {
        const active = code === current;
        return (
          <form key={code} action={setLocaleAction}>
            <input type="hidden" name="locale" value={code} />
            <button
              type="submit"
              className={[
                "rounded-full px-3 py-1 transition",
                active ? "bg-[#e86a33] text-white" : "text-white/75 hover:text-white"
              ].join(" ")}
              aria-pressed={active}
            >
              {code.toUpperCase()}
            </button>
          </form>
        );
      })}
    </div>
  );
}
