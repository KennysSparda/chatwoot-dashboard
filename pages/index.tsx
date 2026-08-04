import { Inbox, MessageSquareOff, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import StatCard from '@/components/StatCard';
import AgentTable from '@/components/AgentTable';
import ConversationList from '@/components/ConversationList';
import { useDashboard } from '@/hooks/useDashboard';
import { formatSeconds } from '@/lib/chatwoot';

export default function DashboardPage() {
  const { data, loading, error, lastUpdated, refresh } = useDashboard(30000);

  return (
    <div className="min-h-screen bg-[#0d0d0f] px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-xl font-semibold tracking-tight">Suporte — Painel</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}` : 'Carregando...'}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">
            Erro ao buscar dados: {error}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Conversas Abertas"
            value={data?.counts.open ?? '—'}
            icon={<Inbox size={16} />}
            accent
            loading={loading && !data}
          />
          <StatCard
            label="Não Atribuídas"
            value={data?.counts.unassigned ?? '—'}
            icon={<MessageSquareOff size={16} />}
            alert={!!data && data.counts.unassigned > 0}
            loading={loading && !data}
          />
          <StatCard
            label="Resolvidas (7d)"
            value={data?.counts.resolved ?? '—'}
            icon={<CheckCircle2 size={16} />}
            loading={loading && !data}
          />
          <StatCard
            label="T. Médio 1ª Resposta"
            value={data?.summary ? formatSeconds(data.summary.avg_first_response_time) : '—'}
            icon={<Clock size={16} />}
            loading={loading && !data}
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <AgentTable agents={data?.agents ?? []} metrics={data?.agentMetrics ?? []} />
          </div>
          <div className="lg:col-span-3">
            <ConversationList
              conversations={data?.recentConversations ?? []}
              baseUrl={data?.meta.baseUrl ?? ''}
              accountId={data?.meta.accountId ?? ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
