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
  CsatMetrics,
} from "@/types/chatwoot";
import { ChatwootService } from "./cache";
import {
  buildConversationMetrics,
  calculateQueueMetrics,
  calculateAiAssistantMetrics,
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

interface OfficialCsatMetrics {
  total_count?: number;
  ratings_count?: Record<string, number>;
  total_sent_messages_count?: number;
}

const CACHE_TTL = {
  agents: 60 * 60,
  inboxes: 60 * 60,
  accountSummary: 5 * 60,
  historicalAgents: 15 * 60,
  liveAgents: 30,
  csat: 15 * 60,
  chartDay: 5 * 60,
  chartWeek: 60 * 60,
  chartMonth: 6 * 60 * 60,
} as const;

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, {
        headers: this.headers,
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async cached<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cachedData = this.getFromCache<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    const data = await loader();
    this.setCache(key, data, ttlSeconds);
    return data;
  }

  private async fetchAllPages<T>(
    endpoint: string,
    extractor: (response: any) => T[],
  ): Promise<T[]> {
    let page = 1;
    const results: T[] = [];

    while (true) {
      const separator = endpoint.includes("?") ? "&" : "?";
      const response = await this.request<any>(
        `${this.baseUrl}${endpoint}${separator}page=${page}`,
      );
      const items = extractor(response);

      if (!items.length) break;

      results.push(...items);

      if (items.length < 25) break;
      page += 1;
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
    return this.cached(`agents_${this.accountId}`, CACHE_TTL.agents, () =>
      this.fetchV1<Agent[]>("/agents"),
    );
  }

  async getInboxes(): Promise<Inbox[]> {
    return this.cached(
      `inboxes_${this.accountId}`,
      CACHE_TTL.inboxes,
      async () => {
        const data = await this.fetchV1<{ payload: Inbox[] }>("/inboxes");
        return data.payload ?? [];
      },
    );
  }

  private async getOpenConversations(): Promise<Conversation[]> {
    return this.fetchAllPages<Conversation>(
      `/api/v1/accounts/${this.accountId}/conversations?status=open`,
      (response) => response.data?.payload ?? response.payload ?? [],
    );
  }

  private async getPendingConversations(): Promise<Conversation[]> {
    return this.fetchAllPages<Conversation>(
      `/api/v1/accounts/${this.accountId}/conversations?status=pending`,
      (response) => response.data?.payload ?? response.payload ?? [],
    );
  }

  async getAccountSummary(
    since: number,
    until: number,
  ): Promise<ReportSummary> {
    return this.cached(
      `account_summary_${this.accountId}_${since}_${until}`,
      CACHE_TTL.accountSummary,
      () =>
        this.fetchV2<ReportSummary>(
          `/reports/summary?type=account&since=${since}&until=${until}`,
        ),
    );
  }

  async getHistoricalAgentMetrics(
    since: number,
    until: number,
  ): Promise<AgentMetrics[]> {
    return this.cached(
      `historical_agents_${this.accountId}_${since}_${until}`,
      CACHE_TTL.historicalAgents,
      async () => {
        const data = await this.fetchV2<AgentMetrics[]>(
          `/summary_reports/agent?since=${since}&until=${until}`,
        );
        return Array.isArray(data) ? data : [];
      },
    );
  }

  async getLiveAgentMetrics(): Promise<LiveAgentMetrics[]> {
    return this.cached(
      `live_agents_${this.accountId}`,
      CACHE_TTL.liveAgents,
      async () => {
        const data = await this.fetchV2<LiveAgentMetrics[]>(
          "/reports/conversations/",
        );
        return Array.isArray(data) ? data : [];
      },
    );
  }

  async getCsatMetricsOfficial(
    since: number,
    until: number,
  ): Promise<OfficialCsatMetrics> {
    return this.cached(
      `csat_${this.accountId}_${since}_${until}`,
      CACHE_TTL.csat,
      () =>
        this.fetchV1<OfficialCsatMetrics>(
          `/csat_survey_responses/metrics?since=${since}&until=${until}`,
        ),
    );
  }

  async getAccountReport(
    metric: string,
    since: number,
    until: number,
    ttlSeconds: number,
  ): Promise<ReportDataPoint[]> {
    const cacheKey = `report_${this.accountId}_${metric}_${since}_${until}`;

    return this.cached(cacheKey, ttlSeconds, async () => {
      const data = await this.fetchV2<ReportDataPoint[]>(
        `/reports?metric=${metric}&type=account&group_by=day&business_hours=false&timezone_offset=-3&since=${since}&until=${until}`,
      );
      return Array.isArray(data) ? data : [];
    });
  }

  async getTodayHourlyReport(): Promise<ReportDataPoint[]> {
    const now = new Date();
    const spDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const since = Math.floor(
      new Date(`${spDateStr}T00:00:00-03:00`).getTime() / 1000,
    );
    const until = Math.floor(
      new Date(`${spDateStr}T23:59:59-03:00`).getTime() / 1000,
    );

    return this.cached(
      `today_hourly_${this.accountId}_${spDateStr}`,
      CACHE_TTL.chartDay,
      async () => {
        const data = await this.fetchV2<ReportDataPoint[]>(
          `/reports?metric=conversations_count&type=account&group_by=hour&business_hours=false&timezone_offset=-3&since=${since}&until=${until}`,
        );
        return Array.isArray(data) ? data : [];
      },
    );
  }

  private buildCsatMetrics(
    officialMetrics: OfficialCsatMetrics | null,
  ): CsatMetrics {
    const ratings = officialMetrics?.ratings_count ?? {};
    const rating1 = Number(ratings["1"] ?? 0);
    const rating2 = Number(ratings["2"] ?? 0);
    const rating3 = Number(ratings["3"] ?? 0);
    const rating4 = Number(ratings["4"] ?? 0);
    const rating5 = Number(ratings["5"] ?? 0);
    const ratingsTotal = rating1 + rating2 + rating3 + rating4 + rating5;
    const totalResponses = Number(officialMetrics?.total_count ?? ratingsTotal);
    const totalSent = Number(officialMetrics?.total_sent_messages_count ?? 0);

    const percentage = (count: number) =>
      totalResponses > 0
        ? Number(((count / totalResponses) * 100).toFixed(2))
        : 0;

    const averageRating =
      totalResponses > 0
        ? Number(
            (
              (rating1 +
                rating2 * 2 +
                rating3 * 3 +
                rating4 * 4 +
                rating5 * 5) /
              totalResponses
            ).toFixed(1),
          )
        : 0;

    return {
      totalResponses,
      averageRating,
      satisfactionPercentage: percentage(rating4 + rating5),
      responseRate:
        totalSent > 0
          ? Number(((totalResponses / totalSent) * 100).toFixed(2))
          : 0,
      breakdown: {
        excellent: {
          rating: 5,
          label: "Excelente",
          emoji: "😍",
          count: rating5,
          percentage: percentage(rating5),
        },
        good: {
          rating: 4,
          label: "Bom",
          emoji: "😜",
          count: rating4,
          percentage: percentage(rating4),
        },
        average: {
          rating: 3,
          label: "Mediano",
          emoji: "😐",
          count: rating3,
          percentage: percentage(rating3),
        },
        neutral: {
          rating: 2,
          label: "Neutro",
          emoji: "😑",
          count: rating2,
          percentage: percentage(rating2),
        },
        bad: {
          rating: 1,
          label: "Ruim",
          emoji: "😞",
          count: rating1,
          percentage: percentage(rating1),
        },
      },
    };
  }

  async getDashboardData(): Promise<DashboardData> {
    const startedAt = Date.now();
    const now = Math.floor(Date.now() / 1000);
    const nowDate = new Date();
    const spDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(nowDate);

    const startOfToday = Math.floor(
      new Date(`${spDateStr}T00:00:00-03:00`).getTime() / 1000,
    );
    const until = Math.floor(
      new Date(`${spDateStr}T23:59:59-03:00`).getTime() / 1000,
    );
    const since = startOfToday - 6 * 86400;
    const thirtyDaysAgo = startOfToday - 29 * 86400;

    const [
      agentsResult,
      inboxesResult,
      openConversationsResult,
      pendingConversationsResult,
      summaryResult,
      historicalAgentMetricsResult,
      liveAgentMetricsResult,
      chartDayResult,
      chartWeekResult,
      chartMonthResult,
      officialCsatMetricsResult,
    ] = await Promise.allSettled([
      this.getAgents(),
      this.getInboxes(),
      this.getOpenConversations(),
      this.getPendingConversations(),
      this.getAccountSummary(since, until),
      this.getHistoricalAgentMetrics(since, until),
      this.getLiveAgentMetrics(),
      this.getTodayHourlyReport(),
      this.getAccountReport(
        "conversations_count",
        since,
        until,
        CACHE_TTL.chartWeek,
      ),
      this.getAccountReport(
        "conversations_count",
        thirtyDaysAgo,
        until,
        CACHE_TTL.chartMonth,
      ),
      this.getCsatMetricsOfficial(since, until),
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

    let resolvedCount =
      summary?.resolutions_count ?? summary?.resolved_conversations_count ?? 0;

    if (Array.isArray(summary)) {
      const resolutionMetric = summary.find(
        (item: any) =>
          item.name === "resolutions_count" ||
          item.name === "resolved_conversations_count",
      );
      resolvedCount = resolutionMetric ? Number(resolutionMetric.value) : 0;
    }

    if (!resolvedCount && historicalAgentMetrics.length > 0) {
      resolvedCount = historicalAgentMetrics.reduce(
        (total, agent) => total + (agent.resolved_conversations_count ?? 0),
        0,
      );
    }

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

    const officialCsatMetrics = valueOrDefault(officialCsatMetricsResult, null);
    const csatMetrics = this.buildCsatMetrics(officialCsatMetrics);

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
        reportPeriod: { since, until },
        requestDurationMs: Date.now() - startedAt,
      },
    };
  }
}
