import { useEffect, useState } from "react";
import clsx from "clsx";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "support-dashboard-theme";

const themes: Array<{
  value: ThemeMode;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}> = [
  {
    value: "light",
    label: "Claro",
    shortLabel: "Claro",
    icon: <Sun size={14} />,
  },
  {
    value: "dark",
    label: "Escuro",
    shortLabel: "Escuro",
    icon: <Moon size={14} />,
  },
];

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    setMounted(true);
  }, []);

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  if (!mounted) {
    return (
      <div className="h-10 w-[214px] rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]" />
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1 shadow-[var(--shadow-card)]">
      {themes.map((item) => {
        const active = theme === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => handleThemeChange(item.value)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              active
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]",
            )}
            aria-pressed={active}
            title={`Tema ${item.label}`}
          >
            {item.icon}
            <span>{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
