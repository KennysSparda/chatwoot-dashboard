import type { CsatMetrics } from "@/types/chatwoot";

interface CsatReportCardProps {
  csat?: CsatMetrics;
  loading?: boolean;
}

export default function CsatReportCard({ csat, loading }: CsatReportCardProps) {
  if (loading || !csat) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 animate-pulse">
        <div className="h-6 w-32 bg-[var(--card-border)] rounded mb-4" />
        <div className="h-16 bg-[var(--card-border)] rounded mb-4" />
        <div className="h-4 bg-[var(--card-border)] rounded" />
      </div>
    );
  }

  const { breakdown, satisfactionPercentage, totalResponses, responseRate } =
    csat;

  const ratingsOrder = [
    { ...breakdown.excellent, color: "bg-emerald-500" },
    { ...breakdown.good, color: "bg-emerald-400" },
    { ...breakdown.average, color: "bg-yellow-400" },
    { ...breakdown.neutral, color: "bg-amber-500" },
    { ...breakdown.bad, color: "bg-red-500" },
  ];

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold text-[var(--text-main)] mb-6">
        Relatórios CSAT
      </h3>

      {/* Linha superior de KPIs */}
      <div className="grid grid-cols-3 gap-4 border-b border-[var(--card-border)] pb-6 mb-6">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase">
            Total de respostas
          </p>
          <p className="text-2xl font-bold text-[var(--text-main)] mt-1">
            {totalResponses}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase">
            Pontuação de satisfação
          </p>
          <p className="text-2xl font-bold text-[var(--text-main)] mt-1">
            {satisfactionPercentage}%
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase">
            Taxa de resposta
          </p>
          <p className="text-2xl font-bold text-[var(--text-main)] mt-1">
            {responseRate}%
          </p>
        </div>
      </div>

      {/* Distribuição de Avaliações */}
      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-3">
          Distribuição de avaliações
        </p>

        {/* Barra proporcional visual */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-800 mb-4">
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

        {/* Legenda dos Emojis */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {ratingsOrder.map((item) => (
            <div key={item.rating} className="flex items-center gap-1.5">
              <span>{item.emoji}</span>
              <span className="font-medium text-[var(--text-soft)]">
                {item.label}
              </span>
              <span className="font-bold text-[var(--text-main)]">
                {item.percentage}%
              </span>
              <span className="text-[var(--text-faint)]">({item.count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
