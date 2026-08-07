import { useState } from "react";
import {
  Inbox,
  MessageSquareOff,
  TimerReset,
  Zap,
  Bot,
  Clock,
  Star,
  Calendar,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import AgentGoalCard from "@/components/AgentGoalCard";
import AgentTable from "@/components/AgentTable";
import ConversationList from "@/components/ConversationList";
import HeaderMenu from "@/components/HeaderMenu";
import ManageAgentsModal from "@/components/ManageAgentsModal";
import { useDashboard } from "@/hooks/useDashboard";
import { useAgentFilter } from "@/hooks/useAgentFilter";
import { formatSeconds } from "@/lib/chatwoot";
import Logo from "@/components/Logo";
import CsatReportCard from "@/components/CsatReportCard";
import ConversationChartCard from "@/components/ConversationsChart";

export default function DashboardPage() {
  const { data, loading, error, lastUpdated, refresh } = useDashboard(30000);
  const { ignoredAgentIds, toggleAgent, mounted } = useAgentFilter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. FILTRA OS AGENTES COM BASE NA CONFIGURAÇÃO (Ignora N2, N3, etc.)
  const rawDashboardAgents = data?.dashboardAgents ?? [];
  const filteredDashboardAgents = mounted
    ? rawDashboardAgents.filter((agent) => !ignoredAgentIds.includes(agent.id))
    : rawDashboardAgents;

  // 2. RECALCULA AS MÉTRICAS BASEADAS APENAS NOS AGENTES FILTRADOS (N1)
  const fastestOnlineAgent =
    filteredDashboardAgents
      .filter((agent) => {
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

  const onlineAgentsCount = filteredDashboardAgents.filter(
    (agent) => agent.availability === "online",
  ).length;

  const busyAgentsCount = filteredDashboardAgents.filter(
    (agent) => agent.availability === "busy",
  ).length;

  const totalAgentsCount = filteredDashboardAgents.length;

  const longestConv = data?.queue.longestWaitingConversation;
  const agentName = longestConv?.assigneeName;

  const longestWaitingSub = longestConv
    ? `${longestConv.contactName}${agentName ? ` · Agente: ${agentName}` : " · Não atribuído"}`
    : data?.queue.waitingCount
      ? `${data.queue.waitingCount} aguardando`
      : "Fila sem espera";

  return (
    <div className="app-shell px-8 py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* CABEÇALHO ATUALIZADO */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-4">
              <Logo />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-main)]">
              Gestão a vista
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

          <div className="flex items-center gap-3 relative">
            <HeaderMenu
              onRefresh={refresh}
              loading={loading}
              onOpenAgentsModal={() => setIsModalOpen(true)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            Erro ao buscar dados: {error}
          </div>
        )}

        {/* STAT CARDS PRINCIPAIS */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AgentGoalCard
            online={onlineAgentsCount}
            busy={busyAgentsCount}
            total={totalAgentsCount}
            goal={6}
            loading={loading && !data}
          />

          <StatCard
            label="📥 Conversas Abertas"
            value={data?.counts.open ?? "—"}
            sub="conversas em atendimento humano"
            icon={<Inbox size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label="🤖 Chats IA (ANA)"
            value={data?.counts.pending ?? "—"}
            sub="conversas pendentes"
            icon={<Bot size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label="⭐ Satisfação (CSAT)"
            value={
              data?.csatMetrics?.satisfactionPercentage !== undefined
                ? `${data.csatMetrics.satisfactionPercentage}%`
                : "—"
            }
            sub={
              data?.csatMetrics?.totalResponses
                ? `${data.csatMetrics.totalResponses} avaliações (média ${data.csatMetrics.averageRating})`
                : "Sem avaliações no período"
            }
            icon={<Star size={16} />}
            loading={loading && !data}
          />
        </div>

        {/* MINI CARDS SECUNDÁRIOS */}
        {data && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard
              label="🧭 Não Atribuídas"
              value={data?.counts.unassigned ?? "—"}
              sub="aguardando atribuição"
              icon={<MessageSquareOff size={16} />}
              alert={!!data && data.counts.unassigned > 0}
              loading={loading && !data}
            />

            <StatCard
              label="⏱️ Aguardando humano"
              value={data?.queue.waitingCount ?? "—"}
              sub="em fila agora"
              icon={<Clock size={16} />}
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

            <StatCard
              label="📊 Período histórico"
              value="Últimos 7 dias"
              sub="base dos dados exibidos"
              icon={<Calendar size={16} />}
              loading={loading && !data}
            />
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CsatReportCard csat={data?.csatMetrics} loading={loading && !data} />
          <ConversationChartCard
            id="day"
            title="📊 Volume de Chats — Dia (Hoje por Hora)"
            data={data?.chartData?.day ?? []}
            loading={loading && !data}
            isHourly
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ConversationChartCard
            id="week"
            title="📈 Volume de Chats — Semana (Últimos 7 dias)"
            data={data?.chartData?.week ?? []}
            loading={loading && !data}
          />

          <ConversationChartCard
            id="month"
            title="📅 Volume de Chats — Mês (Últimos 30 dias)"
            data={data?.chartData?.month ?? []}
            loading={loading && !data}
          />
        </div>

        {/* TABELA E CONVERSAS */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <AgentTable
              agents={data?.agents ?? []}
              metrics={data?.agentMetrics ?? []}
              liveMetrics={data?.liveAgentMetrics ?? []}
              dashboardAgents={filteredDashboardAgents} // Passa os agentes filtrados para a tabela
            />
          </div>

          <div className="xl:col-span-2">
            <ConversationList
              conversations={data?.recentConversations ?? []}
              baseUrl={data?.meta.baseUrl ?? ""}
              accountId={data?.meta.accountId ?? ""}
            />
          </div>
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DE AGENTES */}
      <ManageAgentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agents={rawDashboardAgents} // Passa a lista original bruta para o modal
        ignoredIds={ignoredAgentIds}
        onToggleAgent={toggleAgent}
      />
    </div>
  );
}
