import {
  ChatwootConfig,
  Agent,
  Conversation,
  ReportSummary,
  AgentMetrics,
  LiveAgentMetrics,
  Inbox,
  DashboardData,
  DashboardSourceStatus,
  ReportDataPoint,
} from "@/types/chatwoot";
import { ChatwootService } from "./cache";
import {
  buildConversationMetrics,
  calculateQueueMetrics,
  calculateAiAssistantMetrics,
  calculateCsatMetrics,
} from "./metrics";
import {
  valueOrDefault,
  normalizeDashboardAgents,
  mergeOpenCountIntoHistoricalMetrics,
} from "./transformers";

export interface ConversationMetrics {
  open: number;
  unattended: number;
  pending: number;
}

export class ChatwootClient extends ChatwootService {
  private baseUrl: string;
  private accountId: string;
  private headers: Record<string, string>;

  constructor(config: ChatwootConfig) {
    super();
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

  async getAccountReport(
    metric: string,
    since: number,
    until: number,
  ): Promise<ReportDataPoint[]> {
    const data = await this.fetchV2<ReportDataPoint[]>(
      `/reports?metric=${metric}&type=account&since=${since}&until=${until}`,
    );
    return Array.isArray(data) ? data : [];
  }

  async getTodayHourlyReport(): Promise<ReportDataPoint[]> {
    const cacheKey = `today_hourly_${this.accountId}`;
    const cachedData = this.getFromCache<ReportDataPoint[]>(cacheKey);

    // ⚡ Retorna do cache se ainda for válido
    if (cachedData) {
      return cachedData;
    }

    const now = new Date();

    const spDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const startOfDayTime = new Date(`${spDateStr}T00:00:00-03:00`).getTime();
    const hoursCount = new Array(24).fill(0);
    const BRAZIL_OFFSET_MS = -3 * 3600 * 1000;

    try {
      // 🔧 Busca explícita em todos os status possíveis para capturar chats resolvidos, abertos e pendentes
      const statuses = ["open", "pending", "resolved"];
      const allConversationsMap = new Map<number, any>();

      for (const status of statuses) {
        let page = 1;
        while (page <= 3) {
          const response = await this.fetchV1<any>(
            `/conversations?status=${status}&page=${page}`,
          );
          const payload = response?.data?.payload ?? response?.payload ?? [];

          if (!Array.isArray(payload) || payload.length === 0) break;

          for (const conv of payload) {
            if (conv && conv.id) {
              allConversationsMap.set(conv.id, conv);
            }
          }

          if (payload.length < 25) break;
          page++;
        }
      }

      // Processa todas as conversas unicas coletadas
      for (const conv of allConversationsMap.values()) {
        const activityTimestamp =
          conv.last_activity_at ?? conv.updated_at ?? conv.created_at;
        if (!activityTimestamp) continue;

        const convDate =
          typeof activityTimestamp === "number"
            ? new Date(activityTimestamp * 1000)
            : new Date(activityTimestamp);

        const convTime = convDate.getTime();

        if (convTime >= startOfDayTime) {
          const brazilDate = new Date(convTime + BRAZIL_OFFSET_MS);
          const hourBR = brazilDate.getUTCHours();

          if (!isNaN(hourBR) && hourBR >= 0 && hourBR < 24) {
            hoursCount[hourBR] += 1;
          }
        }
      }
    } catch (error) {
      console.error("Erro ao agrupar conversas por hora:", error);
    }

    const nowBrazil = new Date(now.getTime() + BRAZIL_OFFSET_MS);
    const currentHourBR = nowBrazil.getUTCHours();

    const result = hoursCount.slice(0, currentHourBR + 1).map((count, hour) => {
      const paddedHour = String(hour).padStart(2, "0");
      // 🔧 Cria a data usando explicitamente o offset de Brasília, imune ao fuso local
      const date = new Date(`${spDateStr}T${paddedHour}:00:00-03:00`);
      return {
        timestamp: Math.floor(date.getTime() / 1000),
        value: count,
      };
    });

    // 💾 Salva no cache por 3 minutos
    this.setCache(cacheKey, result, 180);

    return result;
  }

  async getDashboardData(): Promise<DashboardData> {
    const startedAt = Date.now();
    const now = Math.floor(Date.now() / 1000);
    const since = now - 7 * 86400;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

    const [
      agentsResult,
      inboxesResult,
      openConversationsResult,
      pendingConversationsResult,
      summaryResult,
      historicalAgentMetricsResult,
      liveAgentMetricsResult,
      csatResponsesResult,
      chartDayResult,
      chartWeekResult,
      chartMonthResult,
    ] = await Promise.allSettled([
      this.getAgents(),
      this.getInboxes(),
      this.getOpenConversations(),
      this.getPendingConversations(),
      this.getAccountSummary(since, now),
      this.getHistoricalAgentMetrics(since, now),
      this.getLiveAgentMetrics(),
      this.getCsatResponses(since, now),
      this.getTodayHourlyReport(),
      this.getAccountReport("conversations_count", sevenDaysAgo, now),
      this.getAccountReport("conversations_count", thirtyDaysAgo, now),
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

    const conversationMetrics = buildConversationMetrics(openConversations);

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
      chartData: {
        day: valueOrDefault(chartDayResult, []),
        week: valueOrDefault(chartWeekResult, []),
        month: valueOrDefault(chartMonthResult, []),
      },
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
