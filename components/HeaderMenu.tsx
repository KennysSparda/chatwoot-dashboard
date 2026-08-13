import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import clsx from "clsx";
import type { DashboardPeriod, DashboardPeriodPreset } from "@/types/chatwoot";

interface HeaderMenuProps {
  onRefresh: () => void;
  loading: boolean;
  refreshing?: boolean;
  onOpenAgentsModal: () => void;
  period: DashboardPeriod;
  onSelectPreset: (preset: Exclude<DashboardPeriodPreset, "custom">) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApplyPeriod: () => void;
  hasPendingPeriodChanges: boolean;
}

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "support-dashboard-theme";

function getPeriodLabel(period: DashboardPeriod) {
  if (period.preset === "today") return "Hoje";
  if (period.preset === "last7days") return "Últimos 7 dias";
  if (period.preset === "last30days") return "Últimos 30 dias";
  return "Personalizado";
}

const presetOptions: Array<{
  value: Exclude<DashboardPeriodPreset, "custom">;
  label: string;
}> = [
  { value: "today", label: "Hoje" },
  { value: "last7days", label: "7 dias" },
  { value: "last30days", label: "30 dias" },
];

export default function HeaderMenu({
  onRefresh,
  loading,
  refreshing = false,
  onOpenAgentsModal,
  period,
  onSelectPreset,
  onStartDateChange,
  onEndDateChange,
  onApplyPeriod,
  hasPendingPeriodChanges,
}: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentTheme =
      (document.documentElement.getAttribute("data-theme") as ThemeMode | null) ??
      "light";
    setTheme(currentTheme);

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: ThemeMode }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("dashboard-theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("dashboard-theme-change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(
      new CustomEvent("dashboard-theme-change", {
        detail: { theme: nextTheme },
      }),
    );
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-soft)] shadow-sm transition-colors hover:bg-[var(--card-bg-hover)]"
      >
        <Settings size={16} />
        Opções
        {(loading || refreshing) && (
          <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-[var(--brand)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-2xl">
          <div className="mb-3 rounded-lg border border-[var(--card-border)] bg-[var(--app-bg-soft)] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <CalendarDays size={16} />
                Período
              </div>

              <span className="rounded-md border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand)]">
                {getPeriodLabel(period)}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {presetOptions.map((option) => {
                const active = period.preset === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelectPreset(option.value)}
                    className={clsx(
                      "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                      active
                        ? "border-[var(--brand-border)] bg-[var(--brand)] text-white"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-soft)] hover:bg-[var(--card-bg-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0 text-xs font-medium text-[var(--text-muted)]">
                Data inicial
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--text-main)] outline-none transition-colors focus:border-[var(--brand)]"
                />
              </label>

              <label className="min-w-0 text-xs font-medium text-[var(--text-muted)]">
                Data final
                <input
                  type="date"
                  value={period.endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--text-main)] outline-none transition-colors focus:border-[var(--brand)]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onApplyPeriod}
              disabled={!hasPendingPeriodChanges || loading || refreshing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={clsx((loading || refreshing) && "animate-spin")}
              />
              {loading || refreshing ? "Buscando..." : "Buscar período"}
            </button>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onRefresh();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--card-bg-hover)]"
            >
              <RefreshCw
                size={16}
                className={clsx((loading || refreshing) && "animate-spin")}
              />
              Atualizar agora
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenAgentsModal();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--card-bg-hover)]"
            >
              <Users size={16} />
              Filtro de agentes
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--card-bg-hover)]"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
