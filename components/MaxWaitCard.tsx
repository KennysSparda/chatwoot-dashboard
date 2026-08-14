import { TimerReset } from "lucide-react";
import clsx from "clsx";

import type { MaxWaitCardProps } from "@/types/chatwoot";

function getEmotion(waitingSeconds = 0) {
  const minutes = Math.floor(waitingSeconds / 60);

  if (minutes < 5) {
    return {
      emoji: "🙂",
      bg: "bg-sky-50",
      text: "text-sky-700",
      pulse: false,
    };
  }

  if (minutes < 10) {
    return {
      emoji: "😟",
      bg: "bg-amber-50",
      text: "text-amber-700",
      pulse: false,
    };
  }

  return {
    emoji: "😭",
    bg: "bg-red-50",
    text: "text-red-600",
    pulse: true,
  };
}

export default function MaxWaitCard({
  value,
  contact,
  agent,
  waitingSeconds = 0,
  loading = false,
}: MaxWaitCardProps) {
  const emotion = getEmotion(waitingSeconds);

  return (
    <article className="relative overflow-hidden rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--danger)]" />

      <div className="flex items-start justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--danger)]">
          MAIOR ESPERA
        </p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--danger-border)] bg-white/70 text-[var(--danger)]">
          <TimerReset size={18} />
        </span>
      </div>

      {loading ? (
        <div className="mt-6 h-20 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="mt-5 flex items-center gap-5">
          <div
            className={clsx(
              "flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl",
              emotion.bg,
              emotion.pulse && "animate-pulse",
            )}
          >
            <span className="text-7xl leading-none">{emotion.emoji}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={clsx(
                "text-5xl font-extrabold leading-none",
                emotion.text,
              )}
            >
              {value}
            </div>

            <div className="mt-3 truncate text-base font-semibold text-[var(--text-muted)]">
              {contact || "Fila sem espera"}
            </div>

            <div className="mt-1 truncate text-sm text-[var(--text-muted)]">
              {agent ? `Agente: ${agent}` : "Não atribuído"}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
