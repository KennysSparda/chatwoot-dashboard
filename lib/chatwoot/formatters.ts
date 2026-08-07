import { AgentAvailability } from "@/types/chatwoot";

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
