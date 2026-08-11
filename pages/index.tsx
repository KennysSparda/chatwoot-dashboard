import { useState } from "react";
import {
  Bot,
  Clock,
  Inbox,
  MessageSquareOff,
  Star,
  TimerReset,
} from "lucide-react";
import AgentGoalCard from "@/components/AgentGoalCard";
import AgentTable from "@/components/AgentTable";
import ConversationList from "@/components/ConversationList";
import ConversationChartCard from "@/components/ConversationsChart";
import CsatReportCard from "@/components/CsatReportCard";
import HeaderMenu from "@/components/HeaderMenu";
import Logo from "@/components/Logo";
import ManageAgentsModal from "@/components/ManageAgentsModal";
import StatCard from "@/components/StatCard";
import { useAgentFilter } from "@/hooks/useAgentFilter";
import { useDashboard } from "@/hooks/useDashboard";
import { formatSeconds } from "@/lib/chatwoot";

export default function DashboardPage() {
  const { data, loading, error, lastUpdated, refresh } = useDashboard(30000);
  const { ignoredAgentIds, toggleAgent, mounted } = useAgentFilter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rawDashboardAgents = data?.dashboardAgents ?? [];
  const filteredDashboardAgents = mounted
    ? rawDashboardAgents.filter((agent) => !ignoredAgentIds.includes(agent.id))
    : rawDashboardAgents;

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
    ? `${longestConv.contactName}${
        agentName ? ` · Agente: ${agentName}` : " · Não atribuído"
      }`
    : data?.queue.waitingCount
      ? `${data.queue.waitingCount} aguardando`
      : "Fila sem espera";

  const longestWaitingEmoji = !data
    ? "⏳"
    : data.queue.longestWaitingTime >= 900
      ? "😭"
      : data.queue.longestWaitingTime >= 300
        ? "😐"
        : "😊";

  return (
    <div className="app-shell min-h-screen px-3 py-3 sm:px-5 sm:py-4 xl:h-screen xl:overflow-hidden xl:px-5 xl:py-4 2xl:px-6">
      <div className="mx-auto flex w-full max-w-[2400px] flex-col xl:h-full">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden shrink-0 sm:block [&_.revendamais_logo]:!h-16 xl:[&_.revendamais_logo]:!h-14">
              <Logo />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)] sm:text-2xl">
                Gestão à vista
              </h1>
              <p className="mt-0.5 truncate text-xs text-[var(--text-muted)] sm:text-sm">
                {lastUpdated
                  ? `Últimos 7 dias · Atualizado às ${lastUpdated.toLocaleTimeString(
                      "pt-BR",
                    )}`
                  : "Carregando..."}
                {data?.meta.requestDurationMs
                  ? ` · ${data.meta.requestDurationMs}ms`
                  : ""}
              </p>
            </div>
          </div>

          <div className="relative shrink-0">
            <HeaderMenu
              onRefresh={refresh}
              loading={loading}
              onOpenAgentsModal={() => setIsModalOpen(true)}
            />
          </div>
        </header>

        {error && (
          <div className="mb-3 shrink-0 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
            Erro ao buscar dados: {error}
          </div>
        )}

        <section className="mb-3 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 2xl:gap-3 [&>*]:min-w-0 xl:[&>*]:!p-3">
          <AgentGoalCard
            online={onlineAgentsCount}
            busy={busyAgentsCount}
            total={totalAgentsCount}
            goal={6}
            loading={loading && !data}
          />

          <StatCard
            label="📥 Chats Abertos"
            value={data?.counts.open ?? "—"}
            sub="em atendimento"
            icon={<Inbox size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label="🤖 Chats IA"
            value={data?.counts.pending ?? "—"}
            sub="pendentes com ANA"
            icon={<Bot size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label="⭐ CSAT"
            value={
              data?.csatMetrics?.satisfactionPercentage !== undefined
                ? `${data.csatMetrics.satisfactionPercentage}%`
                : "—"
            }
            sub={
              data?.csatMetrics?.totalResponses
                ? `${data.csatMetrics.totalResponses} avaliações · média ${data.csatMetrics.averageRating}`
                : "Sem avaliações"
            }
            icon={<Star size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label="🧭 Não Atribuídas"
            value={data?.counts.unassigned ?? "—"}
            sub="aguardando atribuição"
            icon={<MessageSquareOff size={16} />}
            alert={!!data && data.counts.unassigned > 0}
            loading={loading && !data}
          />

          <StatCard
            label="⏱️ Aguardando"
            value={data?.queue.waitingCount ?? "—"}
            sub="em fila agora"
            icon={<Clock size={16} />}
            loading={loading && !data}
          />

          <StatCard
            label={`${longestWaitingEmoji} Maior Espera`}
            value={data ? formatSeconds(data.queue.longestWaitingTime) : "—"}
            sub={longestWaitingSub}
            icon={<TimerReset size={16} />}
            alert={!!data && data.queue.longestWaitingTime >= 900}
            loading={loading && !data}
          />
        </section>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
          <section className="min-w-0 xl:col-span-4 xl:min-h-0 xl:overflow-hidden">
            <AgentTable
              agents={data?.agents ?? []}
              metrics={data?.agentMetrics ?? []}
              liveMetrics={data?.liveAgentMetrics ?? []}
              dashboardAgents={filteredDashboardAgents}
            />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-3 xl:col-span-5 xl:min-h-0 xl:grid-rows-3 xl:overflow-hidden [&>*]:min-h-0 [&>*]:overflow-hidden">
            <ConversationChartCard
              id="day"
              title="📊 Hoje por hora"
              data={data?.chartData?.day ?? []}
              loading={loading && !data}
              isHourly
            />

            <ConversationChartCard
              id="week"
              title="📈 Últimos 7 dias"
              data={data?.chartData?.week ?? []}
              loading={loading && !data}
            />

            <ConversationChartCard
              id="month"
              title="📅 Últimos 30 dias"
              data={data?.chartData?.month ?? []}
              loading={loading && !data}
            />
          </section>

          <aside className="grid min-w-0 grid-cols-1 gap-3 xl:col-span-3 xl:min-h-0 xl:grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:overflow-hidden [&>*]:min-h-0 [&>*]:overflow-hidden">
            <CsatReportCard
              csat={data?.csatMetrics}
              loading={loading && !data}
            />

            <ConversationList
              conversations={data?.recentConversations ?? []}
              baseUrl={data?.meta.baseUrl ?? ""}
              accountId={data?.meta.accountId ?? ""}
            />
          </aside>
        </main>
      </div>

      <ManageAgentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agents={rawDashboardAgents}
        ignoredIds={ignoredAgentIds}
        onToggleAgent={toggleAgent}
      />
    </div>
  );
}
