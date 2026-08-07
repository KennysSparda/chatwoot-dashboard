import {
  ChatwootConfig,
  Agent,
  AgentAvailability,
  Conversation,
  ConversationListResponse,
  ReportSummary,
  AgentMetrics,
  LiveAgentMetrics,
  Inbox,
  DashboardData,
  DashboardAgent,
  QueueMetrics,
  AiAssistantMetrics,
  DashboardSourceStatus,
  CsatMetrics,
} from "@/types/chatwoot";

type Settled<T> = PromiseSettledResult<T>;

export interface ConversationMetrics {
  open: number;
  unattended: number;
  pending: number;
}

export class ChatwootClient {
  private baseUrl: string;
  private accountId: string;
  private headers: Record<string, string>;

  constructor(config: ChatwootConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.accountId = config.accountId;
    this.headers = {
      api_access_token: config.accessToken,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: this.headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }

    return res.json();
  }

  private async fetchAllPages<T>(
    endpoint: string,
    extractor: (response: any) => T[],
  ): Promise<T[]> {
    let page = 1;

    const results: T[] = [];

    while (true) {
      const response = await this.request<any>(
        `${this.baseUrl}${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${page}`,
      );

      const items = extractor(response);

      if (!items.length) {
        break;
      }

      results.push(...items);

      if (items.length < 25) {
        break;
      }

      page++;
    }

    return results;
  }

  private buildConversationMetrics(
    conversations: Conversation[],
  ): Map<number, ConversationMetrics> {
    const metrics = new Map<number, ConversationMetrics>();

    const ensureAgent = (agentId: number): ConversationMetrics => {
      if (!metrics.has(agentId)) {
        metrics.set(agentId, {
          open: 0,
          unattended: 0,
          pending: 0,
        });
      }

      return metrics.get(agentId)!;
    };

    for (const conversation of conversations) {
      const assigneeId =
        conversation.assignee?.id ?? conversation.meta?.assignee?.id;

      if (!assigneeId) {
        continue;
      }

      const agent = ensureAgent(assigneeId);

      agent.open++;

      if (conversation.waiting_since) {
        agent.unattended++;
      }

      if (conversation.status === "pending") {
        agent.pending++;
      }
    }

    return metrics;
  }

  private async fetchV1<T>(path: string): Promise<T> {
    return this.request<T>(
      `${this.baseUrl}/api/v1/accounts/${this.accountId}${path}`,
    );
  }

  private async fetchV2<T>(path: string): Promise<T> {
    return this.request<T>(
      `${this.baseUrl}/api/v2/accounts/${this.accountId}${path}`,
    );
  }

  async getAgents(): Promise<Agent[]> {
    return this.fetchV1<Agent[]>("/agents");
  }

  async getInboxes(): Promise<Inbox[]> {
    const data = await this.fetchV1<{ payload: Inbox[] }>("/inboxes");
    return data.payload ?? [];
  }

  private async getOpenConversations(): Promise<Conversation[]> {
    return this.fetchAllPages<Conversation>(
      `/api/v1/accounts/${this.accountId}/conversations?status=open`,
      (response) => response.data?.payload ?? [],
    );
  }

  private async getPendingConversations(): Promise<Conversation[]> {
    return this.fetchAllPages<Conversation>(
      `/api/v1/accounts/${this.accountId}/conversations?status=pending`,
      (response) => response.data?.payload ?? [],
    );
  }

  async getAccountSummary(
    since: number,
    until: number,
  ): Promise<ReportSummary> {
    return this.fetchV2<ReportSummary>(
      `/reports/summary?since=${since}&until=${until}`,
    );
  }

  async getHistoricalAgentMetrics(
    since: number,
    until: number,
  ): Promise<AgentMetrics[]> {
    const data = await this.fetchV2<AgentMetrics[]>(
      `/summary_reports/agent?since=${since}&until=${until}`,
    );

    return Array.isArray(data) ? data : [];
  }

  async getLiveAgentMetrics(): Promise<LiveAgentMetrics[]> {
    const data = await this.fetchV2<LiveAgentMetrics[]>(
      "/reports/conversations/",
    );

    return Array.isArray(data) ? data : [];
  }

  async getCsatResponses(since: number, until: number): Promise<any[]> {
    return this.fetchAllPages<any>(
      `/api/v1/accounts/${this.accountId}/csat_survey_responses?since=${since}&until=${until}`,
      (response) =>
        Array.isArray(response) ? response : (response.payload ?? []),
    );
  }

  async getDashboardData(): Promise<DashboardData> {
    const startedAt = Date.now();
    const now = Math.floor(Date.now() / 1000);
    const since = now - 7 * 86400;

    const [
      agentsResult,
      inboxesResult,
      openConversationsResult,
      pendingConversationsResult,
      summaryResult,
      historicalAgentMetricsResult,
      liveAgentMetricsResult,
      csatResponsesResult,
    ] = await Promise.allSettled([
      this.getAgents(),
      this.getInboxes(),
      this.getOpenConversations(),
      this.getPendingConversations(),
      this.getAccountSummary(since, now),
      this.getHistoricalAgentMetrics(since, now),
      this.getLiveAgentMetrics(),
      this.getCsatResponses(since, now),
    ]);

    const agents = valueOrDefault(agentsResult, []);
    const inboxes = valueOrDefault(inboxesResult, []);
    const openConversations = valueOrDefault(openConversationsResult, []);
    const pendingConversations = valueOrDefault(pendingConversationsResult, []);
    const summary = valueOrDefault(summaryResult, null);
    const historicalAgentMetrics = valueOrDefault(
      historicalAgentMetricsResult,
      [],
    );
    const liveAgentMetrics = valueOrDefault(liveAgentMetricsResult, []);

    const conversationMetrics =
      this.buildConversationMetrics(openConversations);

    const openCount = openConversations.length;

    const unassignedCount = openConversations.filter(
      (conversation) => !conversation.assignee && !conversation.meta?.assignee,
    ).length;

    const pendingCount = pendingConversations.length;

    const resolvedCount =
      summary?.resolutions_count ?? summary?.resolved_conversations_count ?? 0;

    const queue = calculateQueueMetrics(openConversations, now);

    const aiAssistant = calculateAiAssistantMetrics(pendingConversations, now);

    const dashboardAgents = normalizeDashboardAgents({
      agents,
      historicalAgentMetrics,
      liveAgentMetrics,
      conversationMetrics,
    });

    const agentMetrics = mergeOpenCountIntoHistoricalMetrics(
      historicalAgentMetrics,
      liveAgentMetrics,
    );

    const sources: DashboardSourceStatus = {
      agents: agentsResult.status === "fulfilled",
      inboxes: inboxesResult.status === "fulfilled",
      conversations: openConversationsResult.status === "fulfilled",
      accountSummary: summaryResult.status === "fulfilled",
      historicalAgentMetrics:
        historicalAgentMetricsResult.status === "fulfilled",
      liveAgentMetrics: liveAgentMetricsResult.status === "fulfilled",
    };

    const csatResponses = valueOrDefault(csatResponsesResult, []);

    const csatMetrics = calculateCsatMetrics(csatResponses, resolvedCount);

    return {
      counts: {
        open: openCount,
        unassigned: unassignedCount,
        pending: pendingCount,
        resolved: resolvedCount,
      },
      summary,
      agentMetrics,
      liveAgentMetrics,
      dashboardAgents,
      recentConversations: openConversations.slice(0, 20),
      agents,
      inboxes,
      queue,
      aiAssistant,
      sources,
      csatMetrics,
      meta: {
        baseUrl: this.baseUrl,
        accountId: this.accountId,
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          since,
          until: now,
        },
        requestDurationMs: Date.now() - startedAt,
      },
    };
  }
}

function valueOrDefault<T>(result: Settled<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function normalizeDashboardAgents(input: {
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

function mergeOpenCountIntoHistoricalMetrics(
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

function calculateQueueMetrics(
  conversations: Conversation[],
  now: number,
): QueueMetrics {
  const waiting = conversations
    .filter((conversation) => {
      return (
        typeof conversation.waiting_since === "number" &&
        conversation.waiting_since > 0 &&
        conversation.waiting_since <= now
      );
    })
    .map((conversation) => {
      const waitingSince = conversation.waiting_since as number;
      const waitingTime = Math.max(0, now - waitingSince);

      return {
        conversation,
        waitingSince,
        waitingTime,
      };
    });

  const totalWaitingTime = waiting.reduce(
    (sum, item) => sum + item.waitingTime,
    0,
  );

  const averageWaitingTime =
    waiting.length > 0 ? Math.round(totalWaitingTime / waiting.length) : 0;

  const longest =
    waiting.length > 0
      ? waiting.reduce((current, item) => {
          return item.waitingTime > current.waitingTime ? item : current;
        }, waiting[0])
      : null;

  return {
    waitingCount: waiting.length,
    averageWaitingTime,
    longestWaitingTime: longest?.waitingTime ?? 0,
    longestWaitingConversation: longest
      ? {
          id: longest.conversation.id,
          displayId: longest.conversation.display_id,
          contactName:
            longest.conversation.meta?.sender?.name ??
            `Conversa ${longest.conversation.id}`,
          waitingSince: longest.waitingSince,
          waitingTime: longest.waitingTime,
          assigneeName:
            longest.conversation.assignee?.name ??
            longest.conversation.meta?.assignee?.name ??
            null,
          assignedToAgentBot: Boolean(longest.conversation.assignee_agent_bot),
        }
      : null,
  };
}

function calculateAiAssistantMetrics(
  conversations: Conversation[],
  now: number,
): AiAssistantMetrics {
  const configuredBotId = normalizeNumber(process.env.ANA_IA_AGENT_BOT_ID);
  const configuredBotName =
    process.env.ANA_IA_AGENT_BOT_NAME?.trim().toLowerCase() ?? "ana";

  const identifiedByBotId = typeof configuredBotId === "number";

  const aiConversations = conversations.filter((conversation) => {
    if (
      typeof configuredBotId === "number" &&
      conversation.assignee_agent_bot?.id === configuredBotId
    ) {
      return true;
    }

    const botName = conversation.assignee_agent_bot?.name?.toLowerCase();

    if (botName && botName.includes(configuredBotName)) {
      return true;
    }

    return false;
  });

  const waitingTimes = aiConversations
    .filter((conversation) => {
      return (
        typeof conversation.waiting_since === "number" &&
        conversation.waiting_since > 0 &&
        conversation.waiting_since <= now
      );
    })
    .map((conversation) => now - (conversation.waiting_since as number));

  return {
    identified: aiConversations.length > 0,
    identificationMethod:
      aiConversations.length > 0
        ? identifiedByBotId
          ? "agent_bot_id"
          : "agent_bot_name"
        : null,
    openConversations: aiConversations.length,
    waitingConversations: waitingTimes.length,
    longestWaitingTime: waitingTimes.length > 0 ? Math.max(...waitingTimes) : 0,
  };
}

function normalizeNumber(value: unknown): number | null {
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

export function formatSeconds(
  seconds: number | string | null | undefined,
): string {
  if (seconds === null || seconds === undefined || seconds === "") {
    return "—";
  }

  const value =
    typeof seconds === "string" ? Number.parseFloat(seconds) : seconds;

  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  if (value < 60) {
    return `${Math.round(value)}s`;
  }

  if (value < 3600) {
    return `${Math.round(value / 60)}m`;
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function timeAgo(timestamp: number | null | undefined): string {
  if (!timestamp) {
    return "—";
  }

  const diff = Date.now() / 1000 - timestamp;

  if (diff < 60) {
    return "agora";
  }

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h`;
  }

  return `${Math.floor(diff / 86400)}d`;
}

export function priorityColor(priority: string | null | undefined): string {
  switch (priority) {
    case "urgent":
      return "text-red-400 bg-red-400/10";
    case "high":
      return "text-orange-400 bg-orange-400/10";
    case "medium":
      return "text-yellow-400 bg-yellow-400/10";
    case "low":
      return "text-blue-400 bg-blue-400/10";
    default:
      return "text-zinc-500 bg-zinc-800";
  }
}

export function channelIcon(channel: string | null | undefined): string {
  if (!channel) {
    return "💬";
  }

  if (channel.includes("whatsapp")) {
    return "💬";
  }

  if (channel.includes("email")) {
    return "✉️";
  }

  if (channel.includes("api")) {
    return "🔌";
  }

  if (channel.includes("facebook")) {
    return "👤";
  }

  if (channel.includes("instagram")) {
    return "📷";
  }

  if (channel.includes("twitter")) {
    return "🐦";
  }

  if (channel.includes("telegram")) {
    return "✈️";
  }

  if (channel.includes("sms")) {
    return "📱";
  }

  return "💬";
}

export function availabilityRank(status: AgentAvailability): number {
  switch (status) {
    case "online":
      return 0;
    case "busy":
      return 1;
    case "offline":
    default:
      return 2;
  }
}

function calculateCsatMetrics(
  responses: any[],
  resolvedCount: number = 0,
): CsatMetrics {
  const defaultBreakdown = {
    excellent: {
      rating: 5,
      label: "Excelente",
      emoji: "😍",
      count: 0,
      percentage: 0,
    },
    good: { rating: 4, label: "Bom", emoji: "😜", count: 0, percentage: 0 },
    average: {
      rating: 3,
      label: "Mediano",
      emoji: "😐",
      count: 0,
      percentage: 0,
    },
    neutral: {
      rating: 2,
      label: "Neutro",
      emoji: "😑",
      count: 0,
      percentage: 0,
    },
    bad: { rating: 1, label: "Ruim", emoji: "😞", count: 0, percentage: 0 },
  };

  if (!responses || !responses.length) {
    return {
      totalResponses: 0,
      averageRating: 0,
      satisfactionPercentage: 0,
      responseRate: 0,
      breakdown: defaultBreakdown,
    };
  }

  const total = responses.length;
  const sumRating = responses.reduce(
    (acc, item) => acc + (item.rating ?? 0),
    0,
  );
  const positiveResponses = responses.filter(
    (item) => (item.rating ?? 0) >= 4,
  ).length;

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  responses.forEach((item) => {
    const r = Number(item.rating);
    if (r >= 1 && r <= 5) {
      counts[r] = (counts[r] || 0) + 1;
    }
  });

  const getPct = (count: number) => Number(((count / total) * 100).toFixed(2));

  // Taxa de resposta = (respostas CSAT / conversas resolvidas) * 100
  const responseRate =
    resolvedCount > 0 ? Number(((total / resolvedCount) * 100).toFixed(2)) : 0;

  return {
    totalResponses: total,
    averageRating: Math.round((sumRating / total) * 10) / 10,
    satisfactionPercentage: Number(
      ((positiveResponses / total) * 100).toFixed(2),
    ),
    responseRate,
    breakdown: {
      excellent: {
        rating: 5,
        label: "Excelente",
        emoji: "😍",
        count: counts[5],
        percentage: getPct(counts[5]),
      },
      good: {
        rating: 4,
        label: "Bom",
        emoji: "😜",
        count: counts[4],
        percentage: getPct(counts[4]),
      },
      average: {
        rating: 3,
        label: "Mediano",
        emoji: "😐",
        count: counts[3],
        percentage: getPct(counts[3]),
      },
      neutral: {
        rating: 2,
        label: "Neutro",
        emoji: "😑",
        count: counts[2],
        percentage: getPct(counts[2]),
      },
      bad: {
        rating: 1,
        label: "Ruim",
        emoji: "😞",
        count: counts[1],
        percentage: getPct(counts[1]),
      },
    },
  };
}
