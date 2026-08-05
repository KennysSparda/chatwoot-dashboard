import type { Conversation } from "@/types/chatwoot";
import { timeAgo, priorityColor, channelIcon } from "@/lib/chatwoot";
import clsx from "clsx";

interface ConversationListProps {
  conversations: Conversation[];
  baseUrl: string;
  accountId: string;
}

function getAssigneeName(conv: Conversation): string | null {
  if (conv.assignee?.name) {
    return conv.assignee.name;
  }

  if (conv.meta?.assignee?.name) {
    return conv.meta.assignee.name;
  }

  if (conv.assignee_agent_bot?.name) {
    return conv.assignee_agent_bot.name;
  }

  return null;
}

export default function ConversationList({
  conversations,
  baseUrl,
  accountId,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Nenhuma conversa aberta
      </div>
    );
  }

  const convUrl = (id: number) =>
    `${baseUrl}/app/accounts/${accountId}/conversations/${id}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-main)]">
          Conversas Abertas Recentes
        </h2>

        <span className="text-xs text-[var(--text-muted)]">
          {conversations.length} exibidas
        </span>
      </div>

      <ul>
        {conversations.map((conv, i) => {
          const assigneeName = getAssigneeName(conv);

          return (
            <li
              key={conv.id}
              className={clsx(
                i < conversations.length - 1 &&
                  "border-b border-[var(--card-border)]",
              )}
            >
              <a
                href={convUrl(conv.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--brand-soft)]"
              >
                <span className="w-7 flex-shrink-0 text-center text-lg">
                  {channelIcon(conv.meta?.channel)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--text-main)]">
                      {conv.meta?.sender?.name || "Desconhecido"}
                    </span>

                    {conv.priority && (
                      <span
                        className={clsx(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          priorityColor(conv.priority),
                        )}
                      >
                        {conv.priority}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>#{conv.id}</span>

                    <span className="text-[var(--text-faint)]">·</span>

                    {assigneeName ? (
                      <span>{assigneeName}</span>
                    ) : (
                      <span className="font-medium text-[var(--brand)]">
                        Não atribuída
                      </span>
                    )}

                    {conv.labels?.length > 0 && (
                      <>
                        <span className="text-[var(--text-faint)]">·</span>
                        <span className="text-[var(--brand)]">
                          {conv.labels[0]}
                        </span>
                      </>
                    )}

                    {conv.assignee_agent_bot?.name && (
                      <>
                        <span className="text-[var(--text-faint)]">·</span>
                        <span className="text-[var(--brand)]">
                          🤖 {conv.assignee_agent_bot.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="text-xs text-[var(--text-muted)]">
                    {timeAgo(
                      conv.last_activity_at ??
                        conv.updated_at ??
                        conv.created_at,
                    )}
                  </span>

                  <div className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-[10px] text-[var(--brand)]">
                      Abrir →
                    </span>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
