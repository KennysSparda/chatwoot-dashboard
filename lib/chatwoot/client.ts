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
  DashboardPeriodPreset,
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

interface PeriodRange {
  since: number;
  until: number;
}

function getDefaultPeriodRange(
  preset: DashboardPeriodPreset,
  startOfToday: number,
  endOfToday: number,
): PeriodRange {
  switch (preset) {
    case "today":
      return {
        since: startOfToday,
        until: endOfToday,
      };

    case "last30days":
      return {
        since: startOfToday - 29 * 86400,
        until: endOfToday,
      };

    case "last7days":
    case "custom":
    default:
      return {
        since: startOfToday - 6 * 86400,
        until: endOfToday,
      };
  }
}

function resolvePeriodRange(
  preset: DashboardPeriodPreset,
  startOfToday: number,
  endOfToday: number,
  requestedSince?: number,
  requestedUntil?: number,
): PeriodRange {
  const defaults = getDefaultPeriodRange(preset, startOfToday, endOfToday);

  return {
    since: requestedSince ?? defaults.since,
    until: requestedUntil ?? defaults.until,
  };
}

function normalizeReportTimestamp(timestamp: number): number {
  return timestamp > 10_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
}

function normalizeReportDataPoints(
  data: ReportDataPoint[],
  since: number,
  until: number,
): ReportDataPoint[] {
  const grouped = new Map<number, number>();

  for (const point of data) {
    const timestamp = normalizeReportTimestamp(Number(point.timestamp));
    const value = Number(point.value) || 0;

    if (!Number.isFinite(timestamp)) continue;
    if (timestamp < since || timestamp > until) continue;

    grouped.set(timestamp, (grouped.get(timestamp) ?? 0) + value);
  }

  return Array.from(grouped.entries())
    .map(([timestamp, value]) => ({
      timestamp,
      value,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
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
    const timeout = setTimeout(() => controller.abort(), 45_000);

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
    // Status de disponibilidade precisa ser consultado em tempo real.
    return this.fetchV1<Agent[]>("/agents");
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
    // Não usar cache: alimenta agentes online, ocupados e o câmbio.
    const data = await this.fetchV2<LiveAgentMetrics[]>(
      "/reports/conversations/",
    );
    return Array.isArray(data) ? data : [];
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
    groupBy: "hour" | "day" = "day",
  ): Promise<ReportDataPoint[]> {
    const cacheKey = `report_${this.accountId}_${metric}_${groupBy}_${since}_${until}`;

    return this.cached(cacheKey, ttlSeconds, async () => {
      const data = await this.fetchV2<ReportDataPoint[]>(
        `/reports?metric=${metric}&type=account&group_by=${groupBy}&business_hours=false&timezone_offset=-3&since=${since}&until=${until}`,
      );
      return Array.isArray(data)
        ? normalizeReportDataPoints(data, since, until)
        : [];
    });
  }

  async getSelectedConversationReport(
    preset: DashboardPeriodPreset,
    since: number,
    until: number,
  ): Promise<ReportDataPoint[]> {
    const groupBy = preset === "today" ? "hour" : "day";
    const ttlSeconds =
      preset === "today"
        ? CACHE_TTL.chartDay
        : preset === "last30days"
          ? CACHE_TTL.chartMonth
          : CACHE_TTL.chartWeek;

    return this.getAccountReport(
      "conversations_count",
      since,
      until,
      ttlSeconds,
      groupBy,
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

  async getDashboardData(
    requestedSince?: number,
    requestedUntil?: number,
    requestedPreset: DashboardPeriodPreset = "last7days",
  ): Promise<DashboardData> {
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
    const endOfToday = Math.floor(
      new Date(`${spDateStr}T23:59:59-03:00`).getTime() / 1000,
    );

    const { since, until } = resolvePeriodRange(
      requestedPreset,
      startOfToday,
      endOfToday,
      requestedSince,
      requestedUntil,
    );

    const [
      agentsResult,
      inboxesResult,
      openConversationsResult,
      pendingConversationsResult,
      summaryResult,
      historicalAgentMetricsResult,
      liveAgentMetricsResult,
      selectedChartResult,
      officialCsatMetricsResult,
    ] = await Promise.allSettled([
      this.getAgents(),
      this.getInboxes(),
      this.getOpenConversations(),
      this.getPendingConversations(),
      this.getAccountSummary(since, until),
      this.getHistoricalAgentMetrics(since, until),
      this.getLiveAgentMetrics(),
      this.getSelectedConversationReport(requestedPreset, since, until),
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
        selected: valueOrDefault(selectedChartResult, []),
      },
      meta: {
        baseUrl: this.baseUrl,
        accountId: this.accountId,
        generatedAt: new Date().toISOString(),
        reportPeriod: { since, until, preset: requestedPreset },
        requestDurationMs: Date.now() - startedAt,
      },
    };
  }
}
