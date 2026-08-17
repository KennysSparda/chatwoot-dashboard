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
        "relative flex min-h-[140px] min-w-0 flex-col items-center justify-center rounded-xl border p-4 text-center shadow-[var(--shadow-card)] transition-colors",
        "bg-[var(--card-bg)] border-[var(--card-border)]",
        "sm:min-h-[148px] sm:p-5",
        "xl:min-h-[140px] xl:p-4",
        "2xl:min-h-[152px] 2xl:p-5",
        accent && "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        alert && "border-[var(--danger-border)] bg-[var(--danger-soft)]",
      )}
      aria-busy={loading}
    >
      {/* Bloco de Texto: Mantido no centro perfeito do card */}
      <div
        className={clsx(
          "flex w-full min-w-0 flex-col items-center justify-center",
          icon ? "px-6 sm:px-8" : "px-2",
        )}
      >
        <p
          className={clsx(
            "min-w-0 max-w-full truncate text-xs font-semibold uppercase tracking-wide",
            alert ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
            "sm:text-sm xl:text-[11px] 2xl:text-xs",
          )}
          title={label}
        >
          {label}
        </p>

        {loading ? (
          <div
            className="mt-3 flex w-full flex-col items-center space-y-2"
            aria-label="Carregando indicador"
          >
            <div className="h-8 w-24 animate-pulse rounded-md bg-[var(--card-border)]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--card-border)]" />
          </div>
        ) : (
          <>
            <p
              className={clsx(
                "app-number-pop mt-1 truncate text-center text-4xl font-extrabold leading-none tracking-tight text-[var(--text-main)]",
                "sm:text-5xl xl:text-5xl",
                alert && "text-[var(--danger)]",
                accent && !alert && "text-[var(--brand)]",
              )}
              title={String(value)}
            >
              {value}
            </p>

            {sub && (
              <p
                className="mt-2 line-clamp-2 text-center text-xs leading-4 text-[var(--text-muted)] sm:text-sm sm:leading-5 xl:truncate xl:text-[11px] 2xl:text-xs"
                title={sub}
              >
                {sub}
              </p>
            )}
          </>
        )}
      </div>

      {/* Ícone Grande: Posicionado na direita, centralizado no meio vertical do card */}
      {icon && (
        <span
          className={clsx(
            "absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--text-muted)] opacity-75 pointer-events-none sm:right-5",
            "[&_svg]:h-8 [&_svg]:w-8 sm:[&_svg]:h-9 sm:[&_svg]:w-9 2xl:[&_svg]:h-10 2xl:[&_svg]:w-10", // Ícone bem destacado
            alert && "text-[var(--danger)] opacity-100",
            accent && !alert && "text-[var(--brand)] opacity-100",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
    </article>
  );
}
