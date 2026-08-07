export interface ChatwootConfig {
  baseUrl: string;
  accountId: string;
  accessToken: string;
}

export type AgentAvailability = "online" | "busy" | "offline";

export interface Agent {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  thumbnail?: string | null;
  availability_status: AgentAvailability;
  conversations_count?: number;
}

export interface AgentBot {
  id: number;
  name: string;
  description?: string | null;
  outgoing_url?: string | null;
  account_id?: number;
  bot_type?: string;
}

export type ConversationStatus = "open" | "resolved" | "pending" | "snoozed";

export type ConversationPriority = "low" | "medium" | "high" | "urgent" | null;

export interface ConversationSender {
  id?: number;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  thumbnail?: string | null;
}

export interface ConversationMeta {
  sender: ConversationSender;
  channel: string;
  assignee?: Agent | null;
  team?: {
    id: number;
    name: string;
  } | null;
}

export interface Conversation {
  id: number;
  display_id?: number;
  status: ConversationStatus;
  inbox_id: number;
  created_at: number;
  updated_at?: number;
  last_activity_at?: number;
  waiting_since?: number | null;
  priority?: ConversationPriority;
  assignee?: Agent | null;
  assignee_agent_bot?: AgentBot | null;
  meta: ConversationMeta;
  labels: string[];
  custom_attributes?: Record<string, unknown>;
  additional_attributes?: Record<string, unknown>;
}

export interface ConversationListMeta {
  mine_count?: number;
  assigned_count?: number;
  unassigned_count?: number;
  all_count?: number;
}

export interface ConversationListResponse {
  data: {
    payload: Conversation[];
    meta?: ConversationListMeta;
  };
}

export interface ConversationCounts {
  open_conversations_count: number;
  unattended_conversations_count: number;
}

export interface DashboardCounts {
  open: number;
  unassigned: number;
  pending: number;
  resolved: number;
}

export interface AccountSummary {
  incoming_messages_count: number;
  outgoing_messages_count: number;
  avg_first_response_time: number | string;
  avg_resolution_time: number | string;
  account_id?: number;
  open_conversations_count?: number;
  resolved_conversations_count?: number;
  resolutions_count?: number;
  conversations_count?: number;
  avg_reply_time?: number | string;
}

export interface ReportSummary {
  incoming_messages_count: number;
  outgoing_messages_count: number;
  avg_first_response_time: number;
  avg_resolution_time: number;
  resolutions_count: number;
  conversations_count?: number;
  open_conversations_count?: number;
  resolved_conversations_count?: number;
  avg_reply_time?: number;
  previous?: {
    incoming_messages_count?: number;
    outgoing_messages_count?: number;
    avg_first_response_time?: number;
    avg_resolution_time?: number;
    resolutions_count?: number;
    conversations_count?: number;
    open_conversations_count?: number;
    resolved_conversations_count?: number;
    reply_time?: number;
    [key: string]: any;
  };
}

export interface AgentMetrics {
  id: number;
  name?: string;
  email?: string;
  conversations_count: number;
  resolved_conversations_count: number;
  avg_first_response_time?: number | null;
  avg_resolution_time?: number | null;
  avg_reply_time?: number | null;
  open_conversations_count?: number;
}

export interface LiveAgentMetricValues {
  open: number;
  unattended: number;
}

export interface LiveAgentMetrics {
  id: number;
  name: string;
  email: string;
  thumbnail?: string | null;
  availability: AgentAvailability;
  metric: LiveAgentMetricValues;
}

export interface DashboardAgent {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  availability: AgentAvailability;
  openConversations: number;
  unattendedConversations: number;
  resolvedConversations: number;
  conversationsHandled: number;
  avgFirstResponseTime: number | null;
  avgResolutionTime: number | null;
  avgReplyTime: number | null;
}

export interface QueueMetrics {
  waitingCount: number;
  averageWaitingTime: number;
  longestWaitingTime: number;
  longestWaitingConversation: {
    id: number;
    displayId?: number;
    contactName: string;
    waitingSince: number;
    waitingTime: number;
    assigneeName: string | null;
    assignedToAgentBot: boolean;
  } | null;
}

export interface AiAssistantMetrics {
  identified: boolean;
  identificationMethod:
    | "agent_bot_id"
    | "agent_bot_name"
    | "agent_id"
    | "label"
    | "inbox"
    | "custom_attribute"
    | null;
  openConversations: number;
  waitingConversations: number;
  longestWaitingTime: number;
}

export interface Inbox {
  id: number;
  name: string;
  channel_type: string;
  avatar_url?: string | null;
}

export interface DashboardSourceStatus {
  agents: boolean;
  inboxes: boolean;
  conversations: boolean;
  accountSummary: boolean;
  historicalAgentMetrics: boolean;
  liveAgentMetrics: boolean;
}

export interface DashboardData {
  counts: DashboardCounts;
  summary: ReportSummary | null;
  agentMetrics: AgentMetrics[];
  liveAgentMetrics: LiveAgentMetrics[];
  dashboardAgents: DashboardAgent[];
  recentConversations: Conversation[];
  agents: Agent[];
  inboxes: Inbox[];
  queue: QueueMetrics;
  aiAssistant: AiAssistantMetrics;
  sources: DashboardSourceStatus;
  csatMetrics: CsatMetrics;
  meta: {
    baseUrl: string;
    accountId: string;
    generatedAt: string;
    reportPeriod: {
      since: number;
      until: number;
    };
    requestDurationMs?: number;
  };
  chartData: {
    day: ReportDataPoint[];
    week: ReportDataPoint[];
    month: ReportDataPoint[];
  };
}

export interface CsatMetrics {
  totalResponses: number;
  averageRating: number; // Ex: 4.8
  satisfactionPercentage: number; // Ex: 95 (% de notas 4 e 5)
}

export interface CsatRatingItem {
  rating: number;
  label: string;
  emoji: string;
  count: number;
  percentage: number;
}

export interface CsatMetrics {
  totalResponses: number;
  averageRating: number;
  satisfactionPercentage: number;
  responseRate: number; // Porcentagem em relação às conversas resolvidas
  breakdown: {
    excellent: CsatRatingItem; // Nota 5
    good: CsatRatingItem; // Nota 4
    average: CsatRatingItem; // Nota 3
    neutral: CsatRatingItem; // Nota 2
    bad: CsatRatingItem; // Nota 1
  };
}

export interface ReportDataPoint {
  value: number;
  timestamp: number;
}
