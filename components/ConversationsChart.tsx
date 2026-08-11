import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ReportDataPoint {
  value: number;
  timestamp: number;
}

interface ConversationChartCardProps {
  id: string;
  title: string;
  data: ReportDataPoint[];
  loading?: boolean;
  isHourly?: boolean;
}

const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export default function ConversationChartCard({
  id,
  title,
  data,
  loading = false,
  isHourly = false,
}: ConversationChartCardProps) {
  const chartData = (data ?? []).map((item) => {
    const date = new Date(item.timestamp * 1000);

    return {
      name: isHourly
        ? hourFormatter.format(date)
        : dateFormatter.format(date).replace(".", ""),
      Chats: Number(item.value) || 0,
      fullDate: isHourly
        ? `Hoje às ${hourFormatter.format(date)}`
        : fullDateFormatter.format(date),
    };
  });

  return (
    <article className="app-card flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl p-3 sm:min-h-[300px] sm:p-4 xl:h-full xl:min-h-0 xl:p-3 2xl:p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold text-[var(--text-main)] 2xl:text-base">
          {title}
        </h2>

        {!loading && chartData.length > 0 && (
          <span className="shrink-0 text-[10px] text-[var(--text-faint)] 2xl:text-xs">
            {chartData.reduce((total, item) => total + item.Chats, 0)} chats
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-[var(--text-muted)] xl:min-h-0">
            Carregando dados...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-[var(--text-muted)] xl:min-h-0">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={0}>
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 6, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`chart-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--card-border)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                minTickGap={isHourly ? 28 : 16}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 10,
                }}
                height={22}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={42}
                tickCount={4}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 10,
                }}
              />

              <Tooltip
                cursor={{ stroke: "var(--brand-border)" }}
                contentStyle={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: 8,
                  color: "var(--text-main)",
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.fullDate ?? ""
                }
                formatter={(value) => [Number(value), "Chats"]}
              />

              <Area
                type="monotone"
                dataKey="Chats"
                stroke="var(--brand)"
                strokeWidth={2}
                fill={`url(#chart-fill-${id})`}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}
