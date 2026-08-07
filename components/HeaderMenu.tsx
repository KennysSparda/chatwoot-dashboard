import { useState, useRef, useEffect } from "react";
import { Settings, RefreshCw, Users, Moon, Sun } from "lucide-react";
import clsx from "clsx";

interface HeaderMenuProps {
  onRefresh: () => void;
  loading: boolean;
  onOpenAgentsModal: () => void;
}

export default function HeaderMenu({
  onRefresh,
  loading,
  onOpenAgentsModal,
}: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(
      (document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark") || "light",
    );

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("support-dashboard-theme", nextTheme);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--card-bg-hover)]"
      >
        <Settings size={16} />
        Opções
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl z-40">
          <div className="p-1.5 flex flex-col gap-1">
            <button
              onClick={() => {
                onRefresh();
                setIsOpen(false);
              }}
              disabled={loading}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--app-bg-soft)] disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin text-[var(--brand)]" : ""}
              />
              Atualizar dados
            </button>

            <button
              onClick={() => {
                onOpenAgentsModal();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--app-bg-soft)]"
            >
              <Users size={14} />
              Filtrar Agentes (N1)
            </button>

            <div className="my-1 h-px bg-[var(--card-border)]" />

            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--app-bg-soft)]"
            >
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
              Mudar para modo {theme === "light" ? "Escuro" : "Claro"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
