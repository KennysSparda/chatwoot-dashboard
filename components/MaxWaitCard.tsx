import { TimerReset } from "lucide-react";
import clsx from "clsx";

import type { MaxWaitCardProps } from "@/types/chatwoot";

function getEmotion(waitingSeconds = 0) {
  const minutes = Math.floor(waitingSeconds / 60);

  if (minutes < 5) {
    return {
      emoji: "🙂",
      pulse: false,
    };
  }

  if (minutes < 10) {
    return {
      emoji: "😟",
      pulse: false,
    };
  }

  return {
    emoji: "😭",
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
    <article
      className={clsx(
        "relative flex min-h-[140px] min-w-0 flex-col items-center justify-center rounded-xl border p-4 text-center shadow-[var(--shadow-card)] transition-colors",
        "border-[var(--danger-border)] bg-[var(--danger-soft)]",
        "sm:min-h-[148px] sm:p-5",
        "xl:min-h-[140px] xl:p-4",
        "2xl:min-h-[152px] 2xl:p-5",
      )}
      aria-busy={loading}
    >
      {/* Emoji Solto e Destaque: Sem caixinha/fundo, tamanho expandido */}
      <div
        className={clsx(
          "absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none sm:left-5",
          emotion.pulse && "animate-pulse",
        )}
      >
        <span className="text-4xl sm:text-5xl 2xl:text-6xl leading-none select-none">
          {emotion.emoji}
        </span>
      </div>

      {/* Bloco Central de Texto (px-16 garante espaço para não encostar no emoji nem no ícone) */}
      <div className="flex w-full min-w-0 flex-col items-center justify-center px-14 sm:px-18">
        <p className="min-w-0 max-w-full truncate text-xs font-bold uppercase tracking-wide text-[var(--danger)] sm:text-sm xl:text-[11px] 2xl:text-xs">
          MAIOR ESPERA
        </p>

        {loading ? (
          <div
            className="mt-3 flex w-full flex-col items-center space-y-2"
            aria-label="Carregando indicador"
          >
            <div className="h-8 w-24 animate-pulse rounded-md bg-[var(--danger-border)] opacity-50" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--danger-border)] opacity-50" />
          </div>
        ) : (
          <>
            <p
              className="app-number-pop mt-1 truncate text-center text-4xl font-extrabold leading-none tracking-tight text-[var(--text-main)] sm:text-5xl xl:text-5xl"
              title={String(value)}
            >
              {value}
            </p>

            <p
              className="mt-2 min-w-0 max-w-full truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm xl:text-[11px] 2xl:text-xs"
              title={contact || "Fila sem espera"}
            >
              {contact || "Fila sem espera"}
            </p>

            {agent && (
              <p
                className="mt-0.5 min-w-0 max-w-full truncate text-[11px] text-[var(--text-muted)] sm:text-xs"
                title={`Agente: ${agent}`}
              >
                Agente: {agent}
              </p>
            )}
          </>
        )}
      </div>

      {/* Ícone na Direita: Mantido no meio vertical */}
      <span
        className={clsx(
          "absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--danger)] opacity-80 pointer-events-none sm:right-5",
          "[&_svg]:h-7 [&_svg]:w-7 sm:[&_svg]:h-8 sm:[&_svg]:w-8 2xl:[&_svg]:h-9 2xl:[&_svg]:w-9",
        )}
        aria-hidden="true"
      >
        <TimerReset />
      </span>
    </article>
  );
}
