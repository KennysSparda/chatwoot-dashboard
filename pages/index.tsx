import {
  Inbox,
  MessageSquareOff,
  RefreshCw,
  TimerReset,
  Zap,
  Users, // Importei o ícone novo
} from "lucide-react";
import StatCard from "@/components/StatCard";
import AgentTable from "@/components/AgentTable";
import ConversationList from "@/components/ConversationList";
import ThemeToggle from "@/components/ThemeToggle";
import { useDashboard } from "@/hooks/useDashboard";
import { formatSeconds } from "@/lib/chatwoot";
import Logo from "@/components/Logo";

export default function DashboardPage() {
  const { data, loading, error, lastUpdated, refresh } = useDashboard(30000);

  const fastestOnlineAgent =
    data?.dashboardAgents
      ?.filter((agent) => {
        return (
          agent.availability === "online" &&
          typeof agent.avgFirstResponseTime === "number" &&
          agent.avgFirstResponseTime > 0
        );
      })
      .sort((a, b) => {
        return (
          (a.avgFirstResponseTime ?? Infinity) -
          (b.avgFirstResponseTime ?? Infinity)
        );
      })[0] ?? null;

  // Calculando as variáveis baseadas no array global do dashboard
  const onlineAgentsCount =
    data?.dashboardAgents?.filter((agent) => agent.availability === "online")
      .length ?? 0;

  const busyAgentsCount =
    data?.dashboardAgents?.filter((agent) => agent.availability === "busy")
      .length ?? 0;

  const totalAgentsCount = data?.dashboardAgents?.length ?? 0;

  const longestWaitingSub = data?.queue.longestWaitingConversation
    ? data.queue.longestWaitingConversation.contactName
    : data?.queue.waitingCount
      ? `${data.queue.waitingCount} aguardando`
      : "Fila sem espera";
  return (
    <div className="app-shell px-8 py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* CABEÇALHO ATUALIZADO */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            {/* Margem inferior (mb-4) para afastar a logo do título */}
            <div className="mb-4">
              <Logo />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-main)]">
              Suporte — Painel atendimentos
            </h1>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {lastUpdated
                ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR")}`
                : "Carregando..."}
              {data?.meta.requestDurationMs
                ? ` · ${data.meta.requestDurationMs}ms`
                : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--card-bg-hover)] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            Erro ao buscar dados: {error}
          </div>
        )}

        {/* Alterado para grid-cols-5 em telas grandes para comportar o novo card */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {/* NOVO CARD: AGENTES */}
          <StatCard
            label="👥 Agentes Ativos"
            value={onlineAgentsCount}
            sub={`${totalAgentsCount} no total · ${busyAgentsCount} ocupados`}
            icon={<Users size={16} />}
            accent
            loading={loading && !data}
          />

          <StatCard
            label="📥 Conversas Abertas"
            value={data?.counts.open ?? "—"}
            icon={<Inbox size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label="🧭 Não Atribuídas"
            value={data?.counts.unassigned ?? "—"}
            icon={<MessageSquareOff size={16} />}
            alert={!!data && data.counts.unassigned > 0}
            loading={loading && !data}
          />

          <StatCard
            label="⏳ Maior Espera Agora"
            value={data ? formatSeconds(data.queue.longestWaitingTime) : "—"}
            sub={longestWaitingSub}
            icon={<TimerReset size={16} />}
            alert={!!data && data.queue.longestWaitingTime >= 900}
            loading={loading && !data}
          />

          <StatCard
            label="⚡ Menor Resp. Online"
            value={
              fastestOnlineAgent
                ? formatSeconds(fastestOnlineAgent.avgFirstResponseTime)
                : "—"
            }
            sub={
              fastestOnlineAgent
                ? fastestOnlineAgent.name
                : onlineAgentsCount > 0
                  ? "Sem métrica válida"
                  : "Sem agente online"
            }
            icon={<Zap size={16} />}
            loading={loading && !data}
          />
        </div>

        {data && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">
                Fontes Chatwoot
              </p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                {Object.values(data.sources).filter(Boolean).length}/
                {Object.values(data.sources).length} OK
              </p>
            </div>

            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">ANA IA</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                {data.aiAssistant.identified
                  ? `${data.aiAssistant.openConversations} abertas`
                  : "Ainda não identificada"}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">
                Aguardando resposta
              </p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                {data.queue.waitingCount}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">
                Período histórico
              </p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Últimos 7 dias
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-4">
            <AgentTable
              agents={data?.agents ?? []}
              metrics={data?.agentMetrics ?? []}
              liveMetrics={data?.liveAgentMetrics ?? []}
              dashboardAgents={data?.dashboardAgents ?? []}
            />
          </div>

          <div className="xl:col-span-1">
            <ConversationList
              conversations={data?.recentConversations ?? []}
              baseUrl={data?.meta.baseUrl ?? ""}
              accountId={data?.meta.accountId ?? ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
