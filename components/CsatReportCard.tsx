import type { CsatMetrics } from "@/types/chatwoot";

interface CsatReportCardProps {
  csat?: CsatMetrics;
  loading?: boolean;
}

function clampPercentage(value: number | undefined | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getCsatStatus(score: number) {
  if (score >= 90) {
    return {
      label: "Excelente",
      color: "text-emerald-400",
      accent: "#10b981",
      glow: "rgba(16,185,129,0.14)",
    };
  }

  if (score >= 80) {
    return {
      label: "Saudável",
      color: "text-lime-400",
      accent: "#84cc16",
      glow: "rgba(132,204,22,0.13)",
    };
  }

  if (score >= 70) {
    return {
      label: "Atenção",
      color: "text-yellow-400",
      accent: "#facc15",
      glow: "rgba(250,204,21,0.13)",
    };
  }

  return {
    label: "Crítico",
    color: "text-red-400",
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.16)",
  };
}

function getNeedlePoint(score: number) {
  // Gauge range: 0% = left, 50% = top, 100% = right.
  const angle = (180 - score * 1.8) * (Math.PI / 180);
  const length = 38;
  const centerX = 60;
  const centerY = 60;

  return {
    x: centerX + Math.cos(angle) * length,
    y: centerY - Math.sin(angle) * length,
  };
}

export default function CsatReportCard({ csat, loading }: CsatReportCardProps) {
  if (loading || !csat) {
    return (
      <section className="flex h-full min-h-[220px] flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-card)]">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-[var(--card-border)]" />
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="h-24 rounded-xl bg-[var(--card-border)]" />
            <div className="space-y-2">
              <div className="h-8 rounded bg-[var(--card-border)]" />
              <div className="h-8 rounded bg-[var(--card-border)]" />
            </div>
          </div>
          <div className="h-3 rounded-full bg-[var(--card-border)]" />
        </div>
      </section>
    );
  }

  const { breakdown, satisfactionPercentage, totalResponses, responseRate } =
    csat;

  const score = clampPercentage(satisfactionPercentage);
  const responseScore = clampPercentage(responseRate);
  const status = getCsatStatus(score);
  const needle = getNeedlePoint(score);

  const ratingsOrder = [
    { ...breakdown.excellent, color: "bg-emerald-500" },
    { ...breakdown.good, color: "bg-lime-400" },
    { ...breakdown.average, color: "bg-yellow-400" },
    { ...breakdown.neutral, color: "bg-amber-500" },
    { ...breakdown.bad, color: "bg-red-500" },
  ];

  const excellent = breakdown.excellent;
  const bad = breakdown.bad;

  return (
    <section
      className="flex h-full min-h-[220px] min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-card)] 2xl:p-5"
      style={{
        backgroundImage: `radial-gradient(circle at 12% 0%, ${status.glow}, transparent 34%), linear-gradient(135deg, rgba(244,63,94,0.08), transparent 42%)`,
      }}
    >
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Satisfação do cliente
          </p>
          <h3 className="mt-1 truncate text-base font-bold text-[var(--text-main)] 2xl:text-lg">
            Qualidade do atendimento
          </h3>
        </div>

        <span
          className={`shrink-0 rounded-full border border-[var(--card-border)] bg-[var(--app-bg-soft)] px-2.5 py-1 text-xs font-semibold ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      <div className="grid shrink-0 grid-cols-[136px_minmax(0,1fr)] gap-3 2xl:grid-cols-[150px_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center justify-center rounded-xl border border-[var(--card-border)] bg-black/10 px-2 py-2">
          <div className="relative h-[112px] w-[130px] 2xl:h-[120px] 2xl:w-[144px]">
            <svg
              viewBox="0 0 120 88"
              className="h-full w-full overflow-visible"
              aria-label={`CSAT ${score}%`}
            >
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke="rgba(148,163,184,0.22)"
                strokeLinecap="round"
                strokeWidth="13"
                pathLength={100}
              />
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke={status.accent}
                strokeLinecap="round"
                strokeWidth="13"
                pathLength={100}
                strokeDasharray={`${score} 100`}
              />
              <line
                x1="60"
                y1="60"
                x2={needle.x}
                y2={needle.y}
                stroke="var(--text-main)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="60" cy="60" r="4" fill="var(--text-main)" />
            </svg>

            <div className="absolute inset-x-0 bottom-0 text-center">
              <p className="text-lg font-black leading-none text-[var(--text-main)] 2xl:text-xl">
                {score}%
              </p>
              <div className="mt-1 flex justify-between px-4 text-[8px] font-semibold text-[var(--text-faint)]">
                <span>0</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--app-bg-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Respostas
            </p>
            <p className="mt-0.5 text-xl font-bold leading-none text-[var(--text-main)]">
              {totalResponses}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--app-bg-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Taxa de resposta
            </p>
            <p className="mt-0.5 text-xl font-bold leading-none text-[var(--text-main)]">
              {responseScore}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 shrink-0 border-t border-[var(--card-border)] pt-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Distribuição
          </p>
          <p className="shrink-0 text-[10px] text-[var(--text-faint)]">
            {totalResponses} avaliações
          </p>
        </div>

        <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full bg-zinc-800/70">
          {ratingsOrder.map((item) =>
            item.percentage > 0 ? (
              <div
                key={item.rating}
                className={`h-full ${item.color} transition-all duration-300`}
                style={{ width: `${item.percentage}%` }}
                title={`${item.label}: ${item.percentage}% (${item.count})`}
              />
            ) : null,
          )}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 text-[10px] 2xl:text-[11px]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0">{excellent.emoji}</span>
            <span className="truncate font-medium text-[var(--text-soft)]">
              {excellent.label}
            </span>
            <span className="shrink-0 font-bold text-[var(--text-main)]">
              {excellent.percentage}%
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0">{bad.emoji}</span>
            <span className="truncate font-medium text-[var(--text-soft)]">
              {bad.label}
            </span>
            <span className="shrink-0 font-bold text-[var(--text-main)]">
              {bad.percentage}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
