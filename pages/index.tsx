import {
  Inbox,
  MessageSquareOff,
  RefreshCw,
  TimerReset,
  Zap,
  Bot,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import AgentGoalCard from "@/components/AgentGoalCard";
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

  const onlineAgentsCount =
    data?.dashboardAgents?.filter((agent) => agent.availability === "online")
      .length ?? 0;

  const busyAgentsCount =
    data?.dashboardAgents?.filter((agent) => agent.availability === "busy")
      .length ?? 0;

  const totalAgentsCount = data?.dashboardAgents?.length ?? 0;

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
        {/* CABEÇALHO */}
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

        {/* STAT CARDS PRINCIPAIS */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Card de agentes com meta e animação */}
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
            label="⏳ Maior Espera Agora"
            value={data ? formatSeconds(data.queue.longestWaitingTime) : "—"}
            sub={longestWaitingSub}
            icon={<TimerReset size={16} />}
            alert={!!data && data.queue.longestWaitingTime >= 900}
            loading={loading && !data}
          />
        </div>

        {/* MINI CARDS SECUNDÁRIOS (Padronizados com StatCard) */}
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
              label="✅ Resolvidas"
              value={data?.counts.resolved ?? "—"}
              sub="nos últimos 7 dias"
              icon={<CheckCircle2 size={16} />}
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

        {/* TABELA E CONVERSAS */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <AgentTable
              agents={data?.agents ?? []}
              metrics={data?.agentMetrics ?? []}
              liveMetrics={data?.liveAgentMetrics ?? []}
              dashboardAgents={data?.dashboardAgents ?? []}
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
    </div>
  );
}
