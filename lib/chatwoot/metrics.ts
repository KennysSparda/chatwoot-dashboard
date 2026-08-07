import {
  Conversation,
  QueueMetrics,
  AiAssistantMetrics,
  CsatMetrics,
} from "@/types/chatwoot";
import { ConversationMetrics } from "./client";
import { normalizeNumber } from "./transformers";

export function buildConversationMetrics(
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

export function calculateQueueMetrics(
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

export function calculateAiAssistantMetrics(
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

export function calculateCsatMetrics(
  responses: any[],
  resolvedCount: number = 0,
  surveysSent: number = 0,
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

  // Denominador oficial: Usa as pesquisas enviadas se existirem, caso contrário faz fallback para os resolvidos
  const denominator = surveysSent > 0 ? surveysSent : resolvedCount;
  const responseRate =
    denominator > 0 ? Number(((total / denominator) * 100).toFixed(2)) : 0;

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
