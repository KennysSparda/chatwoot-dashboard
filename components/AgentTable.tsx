import clsx from "clsx";
import type {
  Agent,
  AgentAvailability,
  AgentMetrics,
  DashboardAgent,
  LiveAgentMetrics,
} from "@/types/chatwoot";
import { availabilityRank, formatSeconds } from "@/lib/chatwoot";

interface AgentTableProps {
  agents?: Agent[];
  metrics?: AgentMetrics[];
  liveMetrics?: LiveAgentMetrics[];
  dashboardAgents?: DashboardAgent[];
}

function statusDot(status: AgentAvailability) {
  return (
    <span
      className={clsx(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        status === "online" &&
          "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]",
        status === "busy" &&
          "bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.55)]",
        status === "offline" && "bg-zinc-500",
      )}
    />
  );
}

function statusLabel(status: AgentAvailability) {
  const map: Record<AgentAvailability, string> = {
    online: "Online",
    busy: "Ocupado",
    offline: "Offline",
  };

  return map[status] ?? status;
}

function statusStyle(status: AgentAvailability) {
  if (status === "online") return "text-emerald-400";
  if (status === "busy") return "text-yellow-400";
  return "text-[var(--text-faint)]";
}

function normalizeRows(input: AgentTableProps): DashboardAgent[] {
  if (input.dashboardAgents && input.dashboardAgents.length > 0) {
    return input.dashboardAgents;
  }

  const agents = input.agents ?? [];
  const metrics = input.metrics ?? [];
  const liveMetrics = input.liveMetrics ?? [];

  const metricMap = new Map<number, AgentMetrics>();
  const liveMap = new Map<number, LiveAgentMetrics>();
  const ids = new Set<number>();

  agents.forEach((agent) => ids.add(agent.id));

  metrics.forEach((metric) => {
    metricMap.set(metric.id, metric);
    ids.add(metric.id);
  });

  liveMetrics.forEach((metric) => {
    liveMap.set(metric.id, metric);
    ids.add(metric.id);
  });

  return Array.from(ids).map((id) => {
    const agent = agents.find((item) => item.id === id);
    const metric = metricMap.get(id);
    const live = liveMap.get(id);

    return {
      id,
      name: agent?.name ?? live?.name ?? metric?.name ?? `Agente ${id}`,
      email: agent?.email ?? live?.email ?? metric?.email ?? "",
      avatarUrl:
        agent?.avatar_url ?? agent?.thumbnail ?? live?.thumbnail ?? null,
      availability: live?.availability ?? agent?.availability_status ?? "offline",
      openConversations:
        live?.metric?.open ??
        metric?.open_conversations_count ??
        agent?.conversations_count ??
        0,
      unattendedConversations: live?.metric?.unattended ?? 0,
      resolvedConversations: metric?.resolved_conversations_count ?? 0,
      conversationsHandled: metric?.conversations_count ?? 0,
      avgFirstResponseTime:
        typeof metric?.avg_first_response_time === "number"
          ? metric.avg_first_response_time
          : null,
      avgResolutionTime:
        typeof metric?.avg_resolution_time === "number"
          ? metric.avg_resolution_time
          : null,
      avgReplyTime:
        typeof metric?.avg_reply_time === "number" ? metric.avg_reply_time : null,
    };
  });
}

function sortAgents(rows: DashboardAgent[]) {
  return [...rows].sort((a, b) => {
    const statusDiff =
      availabilityRank(a.availability) - availabilityRank(b.availability);

    if (statusDiff !== 0) return statusDiff;

    const unattendedDiff =
      b.unattendedConversations - a.unattendedConversations;

    if (unattendedDiff !== 0) return unattendedDiff;

    const openDiff = b.openConversations - a.openConversations;

    if (openDiff !== 0) return openDiff;

    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export default function AgentTable(props: AgentTableProps) {
  const rows = sortAgents(normalizeRows(props));

  const totalUnattended = rows.reduce(
    (sum, row) => sum + row.unattendedConversations,
    0,
  );

  if (rows.length === 0) {
    return (
      <section className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Nenhum agente encontrado
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-card)]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3 2xl:px-5 2xl:py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[var(--text-main)] 2xl:text-base">
            👥 Agentes
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-faint)] 2xl:text-xs">
            Online primeiro
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={clsx(
              "text-[11px] font-medium 2xl:text-xs",
              totalUnattended > 0
                ? "text-yellow-500"
                : "text-[var(--text-muted)]",
            )}
          >
            🧭 {totalUnattended} não atendidas
          </div>
        </div>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-[var(--card-bg)]">
            <tr className="border-b border-[var(--card-border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] 2xl:text-[11px]">
              <th className="px-3 py-2 font-medium 2xl:px-4 2xl:py-3">
                Agente
              </th>
              <th className="px-2 py-2 font-medium 2xl:py-3">Status</th>
              <th className="px-1 py-2 text-right font-medium 2xl:py-3">
                Aber.
              </th>
              <th className="px-1 py-2 text-right font-medium 2xl:py-3">
                Não at.
              </th>
              <th className="px-1 py-2 text-right font-medium 2xl:py-3">
                Res.
              </th>
              <th className="px-3 py-2 text-right font-medium 2xl:px-4 2xl:py-3">
                1ª
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
                  "border-b border-[var(--card-border)] transition-colors last:border-0",
                  row.availability === "online" && "bg-emerald-400/[0.04]",
                  row.unattendedConversations > 0 && "bg-yellow-400/[0.05]",
                )}
              >
                <td className="min-w-0 px-3 py-2.5 2xl:px-4 2xl:py-3">
                  <div className="flex min-w-0 items-center gap-2 2xl:gap-3">
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt="perfil"
                        className="h-7 w-7 shrink-0 rounded-full object-cover 2xl:h-8 2xl:w-8"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d255f] text-xs font-semibold text-[#8f7cff] 2xl:h-8 2xl:w-8">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-xs font-medium text-[var(--text-main)] 2xl:text-sm"
                        title={row.name}
                      >
                        {row.name}
                      </p>

                      <p
                        className="truncate text-[10px] text-[var(--text-faint)] 2xl:text-xs"
                        title={row.email || "sem e-mail"}
                      >
                        {row.email || "sem e-mail"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-2.5 2xl:py-3">
                  <div
                    className={clsx(
                      "flex min-w-0 items-center gap-1.5 text-xs 2xl:text-sm",
                      statusStyle(row.availability),
                    )}
                    title={statusLabel(row.availability)}
                  >
                    {statusDot(row.availability)}
                    <span className="truncate">{statusLabel(row.availability)}</span>
                  </div>
                </td>

                <td className="px-1 py-2.5 text-right text-xs font-medium tabular-nums text-[var(--text-main)] 2xl:text-sm">
                  {row.openConversations}
                </td>

                <td
                  className={clsx(
                    "px-1 py-2.5 text-right text-xs font-semibold tabular-nums 2xl:text-sm",
                    row.unattendedConversations > 0
                      ? "text-yellow-500"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  {row.unattendedConversations}
                </td>

                <td className="px-1 py-2.5 text-right text-xs tabular-nums text-[var(--text-soft)] 2xl:text-sm">
                  {row.resolvedConversations}
                </td>

                <td
                  className="px-3 py-2.5 text-right text-xs tabular-nums text-[var(--text-soft)] 2xl:px-4 2xl:text-sm"
                  title={`Primeira resposta: ${formatSeconds(row.avgFirstResponseTime)}`}
                >
                  {formatSeconds(row.avgFirstResponseTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
