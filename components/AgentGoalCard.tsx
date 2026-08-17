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

// Posições seguras dentro da janela visível do recorte (48x48 com scale 0.6).
// NÃO adicione posições fora do intervalo x:[40,120] / y:[40,120] aqui,
// senão o knob é cortado pelo overflow-hidden do container.
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
  const isTurbo = online > 6;

  const { launch, stop } = useConfetti();

  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>(
    GEAR_POS["N"],
  );

  const [displayGear, setDisplayGear] = useState<Gear>("N");
  const [activeGear, setActiveGear] = useState<Gear>("N");

  const currentGearRef = useRef<Gear>("N");
  const animRef = useRef(0);

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

  // Lógica de animação em H do Câmbio.
  // O knob físico só se move dentro das posições reais (N a 6).
  // "Turbo" é tratado como um estado visual separado, não uma posição nova.
  useEffect(() => {
    if (loading) return;

    let targetGear: Gear;
    if (online <= 0) {
      targetGear = "N";
    } else {
      targetGear = String(Math.min(online, 6)) as Gear;
    }

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

      setDisplayGear("N");

      if (from.x === to.x) {
        if (!(await move(to.x, to.y, 250))) return;
      } else if (fromGear === "N") {
        if (!(await move(to.x, N.y, 220))) return;
        if (!(await move(to.x, to.y, 200))) return;
      } else if (toGear === "N") {
        if (!(await move(from.x, N.y, 200))) return;
        if (!(await move(to.x, to.y, 220))) return;
      } else {
        if (!(await move(from.x, N.y, 200))) return;
        if (!(await move(to.x, N.y, 220))) return;
        if (!(await move(to.x, to.y, 200))) return;
      }

      if (animRef.current === animId) {
        currentGearRef.current = toGear;
        setDisplayGear(toGear);
        setActiveGear(toGear);
      }
    };

    runAnimation();
  }, [online, loading]);

  const transitionStyle = {
    transitionProperty: "cx, cy, x, y",
    transitionDuration: "200ms",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const emoji = goalReached ? "😎" : "😭";

  // Rótulo mostrado no badge ativo da fileira de indicadores.
  // Quando isTurbo, destaca "Turbo" em vez do número da marcha.
  const activePill = isTurbo ? "Turbo" : activeGear;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border p-5 shadow-[var(--shadow-card)] transition-all duration-500",
        goalReached
          ? "border-[var(--success-border)] bg-[var(--success-soft)]"
          : "border-[var(--danger-border)] bg-[var(--danger-soft)]",
      )}
    >
      <div
        className={clsx(
          "absolute inset-x-0 top-0 h-1 transition-colors duration-500",
          goalReached ? "bg-[var(--success)]" : "bg-[var(--danger)]",
        )}
      />

      <div className="flex items-start justify-between gap-3 h-full">
        {/* Painel Esquerdo */}
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

          {!loading && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono">
              {(["N", "1", "2", "3", "4", "5", "6", "Turbo"] as const).map(
                (g) => {
                  const isActive = activePill === g;
                  return (
                    <span
                      key={g}
                      className={clsx(
                        "flex h-5 items-center justify-center rounded transition-all duration-300 text-[10px] font-bold px-1",
                        g === "Turbo" ? "min-w-[34px]" : "w-5",
                        isActive
                          ? g === "Turbo"
                            ? "bg-orange-500 text-white shadow-sm border-transparent"
                            : goalReached
                              ? "bg-[var(--success)] text-white shadow-sm border-transparent"
                              : "bg-[var(--danger)] text-white shadow-sm border-transparent"
                          : "bg-[var(--app-bg-soft)] text-[var(--text-muted)] border border-[var(--card-border)]",
                      )}
                    >
                      {g}
                    </span>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* Painel Direito: Câmbio + Emoji */}
        {loading ? (
          <div className="flex shrink-0 items-center gap-2 self-center">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-[var(--card-border)]" />
            <div className="h-14 w-14 animate-pulse rounded-xl bg-[var(--card-border)]" />
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2 self-center">
            {/* Câmbio */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[var(--card-border)] bg-white dark:bg-black/20 shadow-sm flex items-center justify-center">
              {/* Badge de Turbo: sobreposição CONTROLADA no canto,
                  fora do container clipado — não é o mesmo tipo de
                  vazamento visto antes, é um badge intencional. */}
              {isTurbo && (
                <span
                  className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] shadow-sm animate-pulse"
                  title="Turbo"
                >
                  🔥
                </span>
              )}

              <div
                className="absolute w-[160px] h-[160px] flex items-center justify-center pointer-events-none"
                style={{ transform: "scale(0.6)" }}
              >
                <img
                  src="/webmotors_logo.png"
                  alt="Câmbio"
                  className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply dark:mix-blend-screen"
                />

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
                        : isTurbo
                          ? "#f59e0b"
                          : online === 0
                            ? "#a1a1aa"
                            : "#000000ff"
                    }
                    className="transition-all"
                    style={transitionStyle}
                    stroke={
                      goalReached ? "#15803d" : isTurbo ? "#c2410c" : "#d1d5db"
                    }
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
                    {isTurbo ? "6" : displayGear !== "N" ? displayGear : ""}
                  </text>
                </svg>
              </div>
            </div>

            {/* Emoji de humor da meta */}
            <span
              role="img"
              aria-label={goalReached ? "Meta atingida" : "Aguardando meta"}
              className={clsx(
                "text-6xl leading-none transition-transform duration-300",
                goalReached && "scale-110",
              )}
            >
              {emoji}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
