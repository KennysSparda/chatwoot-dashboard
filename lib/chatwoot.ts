import {
  ChatwootConfig,
  Agent,
  Conversation,
  ReportSummary,
  AgentMetrics,
  Inbox,
  DashboardData,
} from '@/types/chatwoot';

export class ChatwootClient {
  private baseUrl: string;
  private accountId: string;
  private headers: Record<string, string>;

  // Este client só deve ser instanciado no servidor (API routes / getServerSideProps).
  // Nunca importe isto em um componente que roda no navegador — o token vazaria no bundle/rede.
  constructor(config: ChatwootConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.accountId = config.accountId;
    this.headers = {
      api_access_token: config.accessToken,
      'Content-Type': 'application/json',
    };
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}${path}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  }

  async getAgents(): Promise<Agent[]> {
    return this.fetch<Agent[]>('/agents');
  }

  async getInboxes(): Promise<Inbox[]> {
    const data = await this.fetch<{ payload: Inbox[] }>('/inboxes');
    return data.payload;
  }

  async getConversationCounts(): Promise<{ open: number; unassigned: number; pending: number; resolved: number }> {
    const data = await this.fetch<{ data: { open_conversations_count: number; unattended_conversations_count: number } }>(
      '/conversations?status=open&page=1'
    );

    // get separate counts
    const [openData, pendingData, resolvedData] = await Promise.all([
      this.fetch<{ data: { meta: { all_count: number; unassigned_count: number } } }>('/conversations?status=open'),
      this.fetch<{ data: { meta: { all_count: number } } }>('/conversations?status=pending'),
      this.fetch<{ data: { meta: { all_count: number } } }>('/conversations?status=resolved'),
    ]);

    return {
      open: openData.data?.meta?.all_count ?? 0,
      unassigned: openData.data?.meta?.unassigned_count ?? 0,
      pending: pendingData.data?.meta?.all_count ?? 0,
      resolved: resolvedData.data?.meta?.all_count ?? 0,
    };
  }

  async getRecentConversations(status: 'open' | 'pending' | 'resolved' = 'open'): Promise<Conversation[]> {
    const data = await this.fetch<{ data: { payload: Conversation[] } }>(
      `/conversations?status=${status}&page=1`
    );
    return data.data?.payload ?? [];
  }

  async getAccountSummary(since: number, until: number): Promise<ReportSummary> {
    return this.fetch<ReportSummary>(
      `/reports/summary?since=${since}&until=${until}`
    );
  }

  async getAgentMetrics(): Promise<AgentMetrics[]> {
    const data = await this.fetch<AgentMetrics[]>('/reports/agents/conversations');
    return Array.isArray(data) ? data : [];
  }

  async getDashboardData(): Promise<DashboardData> {
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - (now % 86400); // midnight UTC approx
    const since = startOfDay - 7 * 86400; // 7 days ago

    const [agents, inboxes, recentConversations, summary, agentMetrics] = await Promise.allSettled([
      this.getAgents(),
      this.getInboxes(),
      this.getRecentConversations('open'),
      this.getAccountSummary(since, now),
      this.getAgentMetrics(),
    ]);

    // counts from conversations list
    const openConvs: Conversation[] = recentConversations.status === 'fulfilled' ? recentConversations.value : [];
    const unassigned = openConvs.filter(c => !c.assignee).length;

    return {
      counts: {
        open: openConvs.length,
        unassigned,
        resolved: summary.status === 'fulfilled' ? (summary.value.resolutions_count ?? 0) : 0,
        pending: 0,
      },
      summary: summary.status === 'fulfilled' ? summary.value : null,
      agentMetrics: agentMetrics.status === 'fulfilled' ? agentMetrics.value : [],
      recentConversations: openConvs.slice(0, 20),
      agents: agents.status === 'fulfilled' ? agents.value : [],
      inboxes: inboxes.status === 'fulfilled' ? inboxes.value : [],
      meta: { baseUrl: this.baseUrl, accountId: this.accountId },
    };
  }
}

export function formatSeconds(seconds: number | string | undefined): string {
  if (!seconds) return '—';
  const s = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  if (isNaN(s) || s === 0) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function priorityColor(priority: string | null | undefined): string {
  switch (priority) {
    case 'urgent': return 'text-red-400 bg-red-400/10';
    case 'high': return 'text-orange-400 bg-orange-400/10';
    case 'medium': return 'text-yellow-400 bg-yellow-400/10';
    case 'low': return 'text-blue-400 bg-blue-400/10';
    default: return 'text-zinc-500 bg-zinc-800';
  }
}

export function channelIcon(channel: string): string {
  if (channel?.includes('whatsapp')) return '💬';
  if (channel?.includes('email')) return '✉️';
  if (channel?.includes('api')) return '🔌';
  if (channel?.includes('facebook')) return '👤';
  if (channel?.includes('instagram')) return '📷';
  if (channel?.includes('twitter')) return '🐦';
  if (channel?.includes('telegram')) return '✈️';
  if (channel?.includes('sms')) return '📱';
  return '💬';
}
