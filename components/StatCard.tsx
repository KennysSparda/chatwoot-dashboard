import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  alert?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  accent,
  alert,
  icon,
  loading,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border p-5 shadow-[var(--shadow-card)] transition-colors",
        "bg-[var(--card-bg)] border-[var(--card-border)]",
        accent && "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        alert && "border-[var(--danger-border)] bg-[var(--danger-soft)]",
      )}
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

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {label}
          </p>

          {loading ? (
            <div className="mt-5 h-9 w-20 animate-pulse rounded-md bg-[var(--card-border)]" />
          ) : (
            <p
              className={clsx(
                "mt-4 text-3xl font-bold tabular-nums app-number-pop",
                alert
                  ? "text-[var(--danger)]"
                  : accent
                    ? "text-[var(--brand)]"
                    : "text-[var(--text-main)]",
              )}
            >
              {value}
            </p>
          )}

          {sub && (
            <p className="mt-3 truncate text-xs text-[var(--text-muted)]">
              {sub}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              alert
                ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]"
                : accent
                  ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "border-[var(--card-border)] bg-[var(--app-bg-soft)] text-[var(--text-muted)]",
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
