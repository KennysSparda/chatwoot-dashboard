import type { ReactNode } from "react";
import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  alert?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  accent = false,
  alert = false,
  icon,
  loading = false,
}: StatCardProps) {
  return (
    <article
      className={clsx(
        "relative flex min-h-[132px] min-w-0 flex-col overflow-hidden rounded-xl border p-4 shadow-[var(--shadow-card)] transition-colors",
        "bg-[var(--card-bg)] border-[var(--card-border)]",
        "sm:min-h-[140px] sm:p-5",
        "xl:min-h-[132px] xl:p-3",
        "2xl:min-h-[144px] 2xl:p-4",
        accent && "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        alert && "border-[var(--danger-border)] bg-[var(--danger-soft)]",
      )}
      aria-busy={loading}
    >
      <div
        className={clsx(
          "absolute inset-x-0 top-0 h-1",
          alert
            ? "bg-[var(--danger)]"
            : accent
              ? "bg-[var(--brand)]"
              : "bg-transparent",
        )}
      />

      <div className="flex min-w-0 items-start justify-between gap-3">
        <p
          className={clsx(
            "min-w-0 truncate text-xs font-semibold uppercase tracking-wide",
            alert ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
            "sm:text-sm xl:text-[11px] 2xl:text-xs",
          )}
          title={label}
        >
          {label}
        </p>

        {icon && (
          <span
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              "border-[var(--card-border)] bg-[var(--app-bg-soft)] text-[var(--text-muted)]",
              "xl:h-8 xl:w-8 2xl:h-9 2xl:w-9",
              alert &&
                "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]",
              accent &&
                !alert &&
                "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand)]",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 min-w-0 flex-1 xl:mt-2">
        {loading ? (
          <div className="space-y-3" aria-label="Carregando indicador">
            <div className="h-8 w-24 animate-pulse rounded-md bg-[var(--card-border)]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--card-border)]" />
          </div>
        ) : (
          <>
            <p
              className={clsx(
                "app-number-pop truncate text-5xl font-bold leading-none tracking-tight text-[var(--text-main)]",
                "sm:text-5xl xl:text-5xl 5xl:text-5xl",
                alert && "text-[var(--danger)]",
                accent && !alert && "text-[var(--brand)]",
              )}
              title={String(value)}
            >
              {value}
            </p>

            {sub && (
              <p
                className="mt-3 line-clamp-2 text-xs leading-4 text-[var(--text-muted)] sm:text-sm sm:leading-5 xl:mt-2 xl:truncate xl:text-[11px] 2xl:text-xs"
                title={sub}
              >
                {sub}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
