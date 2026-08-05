import { useEffect, useRef } from "react";
import { Users } from "lucide-react";
import clsx from "clsx";
import { useConfetti } from "@/hooks/useConfetti";

interface AgentGoalCardProps {
  online: number;
  busy: number;
  total: number;
  goal?: number;
  loading?: boolean;
}

export default function AgentGoalCard({
  online,
  busy,
  total,
  goal = 6,
  loading = false,
}: AgentGoalCardProps) {
  const goalReached = online >= goal;
  const prevOnlineRef = useRef<number | null>(null);
  const { launch } = useConfetti();

  // Dispara confete somente na transição de não-atingido → atingido
  useEffect(() => {
    if (loading) return;
    const prev = prevOnlineRef.current;

    if (prev !== null && prev < goal && online >= goal) {
      launch();
    }

    prevOnlineRef.current = online;
  }, [online, goal, loading, launch]);

  const progressPct = Math.min((online / goal) * 100, 100);

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border p-5 shadow-[var(--shadow-card)] transition-all duration-500",
        goalReached
          ? "border-[var(--success-border)] bg-[var(--success-soft)]"
          : "border-[var(--danger-border)] bg-[var(--danger-soft)]",
      )}
    >
      {/* Barra topo */}
      <div
        className={clsx(
          "absolute inset-x-0 top-0 h-1 transition-colors duration-500",
          goalReached ? "bg-[var(--success)]" : "bg-[var(--danger)]",
        )}
      />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            👥 Agentes Ativos
          </p>

          {loading ? (
            <div className="mt-5 h-9 w-20 animate-pulse rounded-md bg-[var(--card-border)]" />
          ) : (
            <div className="mt-4 flex items-end gap-2">
              <p
                className={clsx(
                  "text-3xl font-bold tabular-nums transition-colors duration-500",
                  goalReached
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]",
                )}
              >
                {online}
              </p>
              <p className="mb-1 text-sm text-[var(--text-muted)]">/ {goal}</p>
              <p
                className={clsx(
                  "mb-1 text-sm font-medium transition-colors duration-500",
                  goalReached
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]",
                )}
              >
                {goalReached ? "🎉 Meta!" : "😢 Abaixo"}
              </p>
            </div>
          )}

          <p className="mt-3 truncate text-xs text-[var(--text-muted)]">
            {total} no total · {busy} ocupados
          </p>

          {/* Barra de progresso */}
          {!loading && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  goalReached ? "bg-[var(--success)]" : "bg-[var(--danger)]",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Ícone */}
        <div
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-500",
            goalReached
              ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]",
          )}
        >
          <Users size={16} />
        </div>
      </div>
    </div>
  );
}
