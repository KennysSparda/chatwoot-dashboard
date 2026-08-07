import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useConfetti } from "@/hooks/useConfetti";

interface AgentGoalCardProps {
  online: number;
  busy: number;
  total: number;
  goal?: number;
  loading?: boolean;
}

const GEAR_POS = {
  N: { x: 80, y: 80 },
  "1": { x: 53, y: 61 },
  "2": { x: 53, y: 100 },
  "3": { x: 80, y: 61 },
  "4": { x: 80, y: 100 },
  "5": { x: 106, y: 61 },
  "6": { x: 106, y: 100 },
} as const;

type Gear = keyof typeof GEAR_POS;

export default function AgentGoalCard({
  online,
  busy,
  total,
  goal = 6,
  loading = false,
}: AgentGoalCardProps) {
  const goalReached = online >= goal;

  const { launch, stop } = useConfetti();

  // Estados de controle da alavanca do câmbio
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>(
    GEAR_POS["N"],
  );

  const [displayGear, setDisplayGear] = useState<Gear>("N");
  const [activeGear, setActiveGear] = useState<Gear>("N");

  const currentGearRef = useRef<Gear>("N");
  const animRef = useRef(0);

  // Mantém o confete enquanto a meta estiver atingida.
  // Para imediatamente quando a meta cair.
  useEffect(() => {
    if (loading) {
      stop();
      return;
    }

    if (goalReached) {
      launch();
    } else {
      stop();
    }
  }, [goalReached, loading, launch, stop]);

  // Lógica de animação em H do Câmbio
  useEffect(() => {
    if (loading) return;

    // Define a marcha alvo limitando de N até a 6ª marcha
    // (se > 6 fica na 6)
    const targetGear = (
      online <= 0 ? "N" : String(Math.min(online, 6))
    ) as Gear;

    if (targetGear === currentGearRef.current) return;

    const runAnimation = async () => {
      const animId = ++animRef.current;
      const fromGear = currentGearRef.current;
      const toGear = targetGear;

      const from = GEAR_POS[fromGear];
      const to = GEAR_POS[toGear];
      const N = GEAR_POS["N"];

      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const move = async (x: number, y: number, wait: number) => {
        if (animRef.current !== animId) return false;

        setKnobPos({ x, y });

        await sleep(wait);

        return animRef.current === animId;
      };

      // Tira o label visualmente para dar realismo ao trocar de marcha
      setDisplayGear("N");

      // Executa o caminho das trilhas
      if (from.x === to.x) {
        // Mesma coluna (ex: 1 pra 2)
        if (!(await move(to.x, to.y, 250))) return;
      } else if (fromGear === "N") {
        // Sai do Neutro para qualquer marcha
        if (!(await move(to.x, N.y, 220))) return;
        if (!(await move(to.x, to.y, 200))) return;
      } else if (toGear === "N") {
        // Sai de qualquer marcha para o Neutro
        if (!(await move(from.x, N.y, 200))) return;
        if (!(await move(to.x, to.y, 220))) return;
      } else {
        // Troca de coluna completa (ex: 2 pra 5)
        if (!(await move(from.x, N.y, 200))) return;
        if (!(await move(to.x, N.y, 220))) return;
        if (!(await move(to.x, to.y, 200))) return;
      }

      // Conclui a animação e reflete visualmente a marcha atual
      if (animRef.current === animId) {
        currentGearRef.current = toGear;
        setDisplayGear(toGear);
        setActiveGear(toGear);
      }
    };

    runAnimation();
  }, [online, loading]);

  // Estilo de transição
  const transitionStyle = {
    transitionProperty: "cx, cy, x, y",
    transitionDuration: "200ms",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border p-5 shadow-[var(--shadow-card)] transition-all duration-500",
        goalReached
          ? "border-[var(--success-border)] bg-[var(--success-soft)]"
          : "border-[var(--danger-border)] bg-[var(--danger-soft)]",
      )}
    >
      {/* Barra colorida no topo */}
      <div
        className={clsx(
          "absolute inset-x-0 top-0 h-1 transition-colors duration-500",
          goalReached ? "bg-[var(--success)]" : "bg-[var(--danger)]",
        )}
      />

      <div className="flex items-start justify-between gap-3 h-full">
        {/* Painel Esquerdo (Textos e Métricas) */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            👥 Agentes Ativos
          </p>

          {loading ? (
            <div className="mt-4 h-10 w-24 animate-pulse rounded-md bg-[var(--card-border)]" />
          ) : (
            <div className="mt-3 flex items-end gap-2">
              <p
                className={clsx(
                  "text-3xl font-bold tabular-nums transition-colors duration-500 app-number-pop",
                  goalReached
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]",
                )}
              >
                {online}
              </p>

              <p className="mb-1 text-sm font-medium text-[var(--text-muted)]">
                / {goal}
              </p>
            </div>
          )}

          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {total} no total · {busy} ocupados
          </p>

          {/* Indicadores numéricos */}
          {!loading && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono">
              {(["N", "1", "2", "3", "4", "5", "6"] as const).map((g) => {
                const isActive = activeGear === g;

                return (
                  <span
                    key={g}
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded transition-all duration-300 text-[10px] font-bold",
                      isActive
                        ? goalReached
                          ? "bg-[var(--success)] text-white shadow-sm border-transparent"
                          : "bg-[var(--danger)] text-white shadow-sm border-transparent"
                        : "bg-[var(--app-bg-soft)] text-[var(--text-muted)] border border-[var(--card-border)]",
                    )}
                  >
                    {g}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel Direito (Máscara do Câmbio Padronizada e Centralizada) */}
        {loading ? (
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-[var(--card-border)] self-center" />
        ) : (
          <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-[var(--card-border)] bg-white dark:bg-black/20 shadow-sm flex items-center justify-center self-center">
            {/* Contêiner interno de 160x160 que recebe o Zoom via escala */}
            <div
              className="absolute w-[160px] h-[160px] flex items-center justify-center pointer-events-none"
              style={{ transform: "scale(0.6)" }}
            >
              {/* Imagem de Fundo original servindo de trilha */}
              <img
                src="/webmotors_logo.png"
                alt="Câmbio"
                className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply dark:mix-blend-screen"
              />

              {/* SVG sobreposto */}
              <svg
                viewBox="0 0 160 160"
                className="absolute inset-0 h-full w-full drop-shadow-sm"
              >
                <circle
                  cx={knobPos.x}
                  cy={knobPos.y}
                  r={14}
                  fill={
                    goalReached
                      ? "#22c55e"
                      : online === 0
                        ? "#a1a1aa"
                        : "#000000ff"
                  }
                  className="transition-all"
                  style={transitionStyle}
                  stroke={goalReached ? "#15803d" : "#d1d5db"}
                  strokeWidth="2"
                />

                <text
                  x={knobPos.x}
                  y={knobPos.y + 5.5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="800"
                  fill={
                    goalReached
                      ? "#ffffff"
                      : online === 0
                        ? "#ffffff"
                        : "#dc2626"
                  }
                  className="transition-all"
                  style={transitionStyle}
                >
                  {displayGear !== "N" ? displayGear : ""}
                </text>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
