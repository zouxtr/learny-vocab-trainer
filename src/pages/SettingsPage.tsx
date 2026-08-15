import { SyncSection } from "@/components/system/SyncSection";
import { useT } from "@/lib/i18n";

/** App settings: cloud sync. Kept off the main dashboard so Home stays
 * focused on the user's dictionaries. */
export function SettingsPage() {
  const t = useT();

  return (
    <main className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{t("Settings")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Manage cloud backup and inspect your local storage.")}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t("Storage & sync")}</h3>
        <div className="max-w-xl">
          <SyncSection />
        </div>
      </section>
    </main>
  );
}