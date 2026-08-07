import { X, Check } from "lucide-react";
import type { DashboardAgent } from "@/types/chatwoot";
import clsx from "clsx";

interface ManageAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: DashboardAgent[];
  ignoredIds: number[];
  onToggleAgent: (id: number) => void;
}

export default function ManageAgentsModal({
  isOpen,
  onClose,
  agents,
  ignoredIds,
  onToggleAgent,
}: ManageAgentsModalProps) {
  if (!isOpen) return null;

  // Ordena alfabeticamente para facilitar a busca
  const sortedAgents = [...agents].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Filtro de Agentes (N1)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Desmarque gestores e N2/N3 para ocultá-los das métricas
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--app-bg-soft)] hover:text-[var(--text-main)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de Agentes */}
        <div className="app-scrollbar flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sortedAgents.map((agent) => {
              const isIncluded = !ignoredIds.includes(agent.id);

              return (
                <button
                  key={agent.id}
                  onClick={() => onToggleAgent(agent.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    isIncluded
                      ? "border-[var(--brand-border)] bg-[var(--brand-soft)]"
                      : "border-[var(--card-border)] bg-[var(--app-bg-soft)] opacity-60 hover:opacity-100",
                  )}
                >
                  <div
                    className={clsx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                      isIncluded
                        ? "bg-[var(--brand)] text-white"
                        : "border border-[var(--card-border-strong)] bg-transparent",
                    )}
                  >
                    {isIncluded && <Check size={14} strokeWidth={3} />}
                  </div>

                  <div className="flex items-center gap-3 overflow-hidden">
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-white">
                        {agent.name.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="truncate text-sm font-medium text-[var(--text-main)]">
                        {agent.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {agent.email || "Sem e-mail"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--card-border)] bg-[var(--app-bg-soft)] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)]"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
