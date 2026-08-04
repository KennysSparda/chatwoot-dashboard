import { Conversation } from '@/types/chatwoot';
import { timeAgo, priorityColor, channelIcon } from '@/lib/chatwoot';
import clsx from 'clsx';

interface ConversationListProps {
  conversations: Conversation[];
  baseUrl: string;
  accountId: string;
}

export default function ConversationList({ conversations, baseUrl, accountId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">
        Nenhuma conversa aberta
      </div>
    );
  }

  const convUrl = (id: number) =>
    `${baseUrl}/app/accounts/${accountId}/conversations/${id}`;

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Conversas Abertas Recentes</h2>
        <span className="text-zinc-600 text-xs">{conversations.length} exibidas</span>
      </div>
      <ul>
        {conversations.map((conv, i) => (
          <li key={conv.id} className={clsx(i < conversations.length - 1 && 'border-b border-zinc-800/40')}>
            <a
              href={convUrl(conv.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/20 transition-colors group"
            >
              {/* Channel icon */}
              <span className="text-lg flex-shrink-0 w-7 text-center">
                {channelIcon(conv.meta?.channel)}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium truncate">
                    {conv.meta?.sender?.name || 'Desconhecido'}
                  </span>
                  {conv.priority && (
                    <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase', priorityColor(conv.priority))}>
                      {conv.priority}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>#{conv.id}</span>
                  {conv.assignee && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span>{conv.assignee.name}</span>
                    </>
                  )}
                  {!conv.assignee && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-yellow-500">Não atribuída</span>
                    </>
                  )}
                  {conv.labels?.length > 0 && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[#6c5ce7]">{conv.labels[0]}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="text-right flex-shrink-0">
                <span className="text-zinc-600 text-xs">{timeAgo(conv.created_at)}</span>
                <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-[#6c5ce7]">Abrir →</span>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
