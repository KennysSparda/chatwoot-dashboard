import { Agent, AgentMetrics } from '@/types/chatwoot';
import { formatSeconds } from '@/lib/chatwoot';
import clsx from 'clsx';

interface AgentTableProps {
  agents: Agent[];
  metrics: AgentMetrics[];
}

function statusDot(status: Agent['availability_status']) {
  return (
    <span
      className={clsx(
        'inline-block w-2 h-2 rounded-full flex-shrink-0',
        status === 'online' && 'bg-emerald-400',
        status === 'busy' && 'bg-yellow-400',
        status === 'offline' && 'bg-zinc-600'
      )}
    />
  );
}

function statusLabel(status: Agent['availability_status']) {
  const map = { online: 'Online', busy: 'Ocupado', offline: 'Offline' };
  return map[status] ?? status;
}

export default function AgentTable({ agents, metrics }: AgentTableProps) {
  const metricsMap = new Map(metrics.map(m => [m.id, m]));

  const rows = agents.map(agent => ({
    agent,
    metrics: metricsMap.get(agent.id),
  }));

  if (rows.length === 0) {
    return (
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">
        Nenhum agente encontrado
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Agentes</h2>
        <span className="text-zinc-600 text-xs">{agents.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="text-left text-zinc-500 font-medium text-xs px-5 py-3 uppercase tracking-wider">Agente</th>
              <th className="text-left text-zinc-500 font-medium text-xs px-3 py-3 uppercase tracking-wider">Status</th>
              <th className="text-right text-zinc-500 font-medium text-xs px-3 py-3 uppercase tracking-wider">Abertas</th>
              <th className="text-right text-zinc-500 font-medium text-xs px-3 py-3 uppercase tracking-wider">Resolvidas</th>
              <th className="text-right text-zinc-500 font-medium text-xs px-5 py-3 uppercase tracking-wider">T. Médio Resp.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ agent, metrics: m }) => (
              <tr key={agent.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#6c5ce7]/20 flex items-center justify-center text-[#6c5ce7] text-xs font-semibold">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium leading-tight">{agent.name}</p>
                      <p className="text-zinc-600 text-xs">{agent.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {statusDot(agent.availability_status)}
                    <span className="text-zinc-400 text-xs">{statusLabel(agent.availability_status)}</span>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <span className="text-white tabular-nums">{m?.open_conversations_count ?? '—'}</span>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <span className="text-emerald-400 tabular-nums">{m?.resolved_conversations_count ?? '—'}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-zinc-400 tabular-nums">
                    {m?.avg_first_response_time ? formatSeconds(m.avg_first_response_time) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
