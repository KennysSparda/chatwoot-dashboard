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
} from "@/types/chatwoot";

type Settled<T> = PromiseSettledResult<T>;

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

  async getOpenConversationsPage(): Promise<ConversationListResponse> {
    return this.fetchV1<ConversationListResponse>(
      "/conversations?status=open&page=1",
    );
  }

  async getPendingConversationsPage(): Promise<ConversationListResponse> {
    return this.fetchV1<ConversationListResponse>(
      "/conversations?status=pending&page=1",
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
    ] = await Promise.allSettled([
      this.getAgents(),
      this.getInboxes(),
      this.getOpenConversationsPage(),
      this.getPendingConversationsPage(),
      this.getAccountSummary(since, now),
      this.getHistoricalAgentMetrics(since, now),
      this.getLiveAgentMetrics(),
    ]);

    const agents = valueOrDefault(agentsResult, []);
    const inboxes = valueOrDefault(inboxesResult, []);
    const openConversationsResponse = valueOrDefault(
      openConversationsResult,
      null,
    );
    const pendingConversationsResponse = valueOrDefault(
      pendingConversationsResult,
      null,
    );
    const summary = valueOrDefault(summaryResult, null);
    const historicalAgentMetrics = valueOrDefault(
      historicalAgentMetricsResult,
      [],
    );
    const liveAgentMetrics = valueOrDefault(liveAgentMetricsResult, []);

    const openConversations = openConversationsResponse?.data?.payload ?? [];

    const pendingConversations =
      pendingConversationsResponse?.data?.payload ?? [];

    const openMeta = openConversationsResponse?.data?.meta;
    const pendingMeta = pendingConversationsResponse?.data?.meta;

    const openCount = openMeta?.all_count ?? openConversations.length;

    const unassignedCount =
      openMeta?.unassigned_count ??
      openConversations.filter((conversation) => !conversation.assignee).length;

    const pendingCount = pendingMeta?.all_count ?? pendingConversations.length;

    const resolvedCount =
      summary?.resolutions_count ?? summary?.resolved_conversations_count ?? 0;

    const queue = calculateQueueMetrics(openConversations, now);

    const aiAssistant = calculateAiAssistantMetrics(openConversations, now);

    const dashboardAgents = normalizeDashboardAgents({
      agents,
      historicalAgentMetrics,
      liveAgentMetrics,
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

  return Array.from(ids).map((id) => {
    const agent = input.agents.find((item) => item.id === id);
    const historical = historicalMap.get(id);
    const live = liveMap.get(id);

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
      openConversations:
        live?.metric?.open ??
        historical?.open_conversations_count ??
        agent?.conversations_count ??
        0,
      unattendedConversations: live?.metric?.unattended ?? 0,
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
