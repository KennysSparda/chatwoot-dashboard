import {
  Agent,
  AgentMetrics,
  LiveAgentMetrics,
  DashboardAgent,
} from "@/types/chatwoot";
import { ConversationMetrics } from "./client";

type Settled<T> = PromiseSettledResult<T>;

export function valueOrDefault<T>(result: Settled<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function normalizeDashboardAgents(input: {
  agents: Agent[];
  historicalAgentMetrics: AgentMetrics[];
  liveAgentMetrics: LiveAgentMetrics[];
  conversationMetrics: Map<number, ConversationMetrics>;
}): DashboardAgent[] {
  const historicalMap = new Map<number, AgentMetrics>();
  const liveMap = new Map<number, LiveAgentMetrics>();

  input.historicalAgentMetrics.forEach((metric) => {
    historicalMap.set(metric.id, metric);
  });

  input.liveAgentMetrics.forEach((metric) => {
    liveMap.set(metric.id, metric);
  });

  const ids = new Set<number>();

  input.agents.forEach((agent) => ids.add(agent.id));
  input.historicalAgentMetrics.forEach((metric) => ids.add(metric.id));
  input.liveAgentMetrics.forEach((metric) => ids.add(metric.id));
  input.conversationMetrics.forEach((_, id) => ids.add(id));

  return Array.from(ids).map((id) => {
    const agent = input.agents.find((item) => item.id === id);
    const historical = historicalMap.get(id);
    const live = liveMap.get(id);
    const metric = input.conversationMetrics.get(id);

    const name =
      agent?.name ?? live?.name ?? historical?.name ?? `Agente ${id}`;

    const email = agent?.email ?? live?.email ?? historical?.email ?? "";

    const availability =
      live?.availability ?? agent?.availability_status ?? "offline";

    return {
      id,
      name,
      email,
      avatarUrl:
        agent?.avatar_url ?? agent?.thumbnail ?? live?.thumbnail ?? null,
      availability,
      openConversations: metric?.open ?? 0,
      unattendedConversations: metric?.unattended ?? 0,
      resolvedConversations: historical?.resolved_conversations_count ?? 0,
      conversationsHandled: historical?.conversations_count ?? 0,
      avgFirstResponseTime: normalizeNumber(
        historical?.avg_first_response_time,
      ),
      avgResolutionTime: normalizeNumber(historical?.avg_resolution_time),
      avgReplyTime: normalizeNumber(historical?.avg_reply_time),
    };
  });
}

export function mergeOpenCountIntoHistoricalMetrics(
  historicalAgentMetrics: AgentMetrics[],
  liveAgentMetrics: LiveAgentMetrics[],
): AgentMetrics[] {
  const historicalMap = new Map<number, AgentMetrics>();

  historicalAgentMetrics.forEach((metric) => {
    historicalMap.set(metric.id, { ...metric });
  });

  liveAgentMetrics.forEach((live) => {
    const existing = historicalMap.get(live.id);

    if (existing) {
      historicalMap.set(live.id, {
        ...existing,
        name: existing.name ?? live.name,
        email: existing.email ?? live.email,
        open_conversations_count: live.metric?.open ?? 0,
      });
      return;
    }

    historicalMap.set(live.id, {
      id: live.id,
      name: live.name,
      email: live.email,
      conversations_count: 0,
      resolved_conversations_count: 0,
      avg_first_response_time: null,
      avg_resolution_time: null,
      avg_reply_time: null,
      open_conversations_count: live.metric?.open ?? 0,
    });
  });

  return Array.from(historicalMap.values());
}
