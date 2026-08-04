export interface ChatwootConfig {
  baseUrl: string;
  accountId: string;
  accessToken: string;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  availability_status: 'online' | 'busy' | 'offline';
  conversations_count?: number;
}

export interface Conversation {
  id: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  assignee?: Agent;
  inbox_id: number;
  created_at: number;
  updated_at?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
  waiting_since?: number;
  meta: {
    sender: { name: string; email?: string };
    channel: string;
  };
  labels: string[];
}

export interface ConversationCounts {
  open_conversations_count: number;
  unattended_conversations_count: number;
}

export interface AccountSummary {
  incoming_messages_count: number;
  outgoing_messages_count: number;
  avg_first_response_time: string;
  avg_resolution_time: string;
  account_id: number;
  open_conversations_count?: number;
  resolved_conversations_count?: number;
  resolutions_count?: number;
}

export interface AgentMetrics {
  id: number;
  name: string;
  email: string;
  open_conversations_count: number;
  resolved_conversations_count: number;
  avg_first_response_time?: number;
  avg_resolution_time?: number;
}

export interface ReportSummary {
  incoming_messages_count: number;
  outgoing_messages_count: number;
  avg_first_response_time: number;
  avg_resolution_time: number;
  resolutions_count: number;
  open_conversations_count?: number;
}

export interface Inbox {
  id: number;
  name: string;
  channel_type: string;
}

export interface DashboardData {
  counts: {
    open: number;
    unassigned: number;
    resolved: number;
    pending: number;
  };
  summary: ReportSummary | null;
  agentMetrics: AgentMetrics[];
  recentConversations: Conversation[];
  agents: Agent[];
  inboxes: Inbox[];
  meta: {
    baseUrl: string;
    accountId: string;
  };
}
