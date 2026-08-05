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
        "inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full",
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
      availability:
        live?.availability ?? agent?.availability_status ?? "offline",
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
        typeof metric?.avg_reply_time === "number"
          ? metric.avg_reply_time
          : null,
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
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-muted)]">
        Nenhum agente encontrado
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-main)]">
            👥 Agentes
          </h2>
        </div>

        <div className="text-right">
          <div
            className={clsx(
              "text-xs font-medium",
              totalUnattended > 0
                ? "text-yellow-500"
                : "text-[var(--text-muted)]",
            )}
          >
            🧭 {totalUnattended} não atendidas
          </div>

          <div className="mt-1 text-xs text-[var(--text-faint)]">
            Online primeiro
          </div>
        </div>
      </div>

      <div className="app-scrollbar max-h-[560px] overflow-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="sticky top-0 z-10 bg-[var(--card-bg)]">
            <tr className="border-b border-[var(--card-border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              <th className="px-5 py-3 font-medium">Agente</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Abertas</th>
              <th className="px-3 py-3 text-right font-medium">Não atend.</th>
              <th className="px-3 py-3 text-right font-medium">Resolvidas</th>
              <th className="px-5 py-3 text-right font-medium">1ª resp.</th>
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
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt="perfil image"
                        className="src w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2d255f] text-sm font-semibold text-[#8f7cff]">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-main)]">
                        {row.name}
                      </p>

                      <p className="truncate text-xs text-[var(--text-faint)]">
                        {row.email || "sem e-mail"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4">
                  <div
                    className={clsx(
                      "flex items-center gap-2 text-sm",
                      statusStyle(row.availability),
                    )}
                  >
                    {statusDot(row.availability)}
                    {statusLabel(row.availability)}
                  </div>
                </td>

                <td className="px-3 py-4 text-right text-sm font-medium tabular-nums text-[var(--text-main)]">
                  {row.openConversations}
                </td>

                <td
                  className={clsx(
                    "px-3 py-4 text-right text-sm font-semibold tabular-nums",
                    row.unattendedConversations > 0
                      ? "text-yellow-500"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  {row.unattendedConversations}
                </td>

                <td className="px-3 py-4 text-right text-sm tabular-nums text-[var(--text-soft)]">
                  {row.resolvedConversations}
                </td>

                <td className="px-5 py-4 text-right text-sm tabular-nums text-[var(--text-soft)]">
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
