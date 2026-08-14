import { useEffect, useState } from "react";
import { checkDbHealth, type DbHealth } from "@/services/database";
import { useT } from "@/lib/i18n";

type Status = "checking" | "ok" | "error";

export function DatabaseHealth() {
  const [status, setStatus] = useState<Status>("checking");
  const [data, setData] = useState<DbHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await checkDbHealth();
        if (!cancelled) {
          setData(health);
          setStatus("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setStatus("checking");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "ok" ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        <p className="text-sm font-medium">{t("System status")}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {status === "checking" && (error ? t("Failed to check database: {error}", { error }) : t("Checking database connection…"))}
        {status === "ok" && t("SQLite ready (v{version}).", { version: data?.database_version ?? "" })}
      </p>
      {status === "ok" && data && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {t("{n} tables · {size}", { n: data.tables.length, size: formatBytes(data.size_bytes) })}
        </p>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}