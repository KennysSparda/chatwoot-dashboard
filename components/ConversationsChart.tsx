import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ReportDataPoint {
  value: number;
  timestamp: number;
}

interface ConversationChartCardProps {
  id: string; // 👈 ID único sem caracteres especiais (ex: "day", "week", "month")
  title: string;
  data: ReportDataPoint[];
  loading?: boolean;
  isHourly?: boolean;
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function ConversationChartCard({
  id,
  title,
  data,
  loading,
  isHourly = false,
}: ConversationChartCardProps) {
  if (loading) {
    return (
      <div className="flex h-[280px] w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <span className="animate-pulse text-sm text-[var(--text-muted)]">
          Carregando dados...
        </span>
      </div>
    );
  }

  const chartData = (data || []).map((item) => {
    const date = new Date(item.timestamp * 1000);
    return {
      name: isHourly
        ? timeFormatter.format(date)
        : dateFormatter.format(date).replace(".", ""),
      Chats: item.value,
      fullDate: isHourly
        ? `Hoje às ${timeFormatter.format(date)}`
        : fullDateFormatter.format(date),
    };
  });

  return (
    <div className="flex h-[280px] flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <h3 className="mb-4 text-sm font-semibold tracking-tight text-[var(--text-main)]">
        {title}
      </h3>

      <div className="h-full w-full flex-1">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            Sem dados registrados para este período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* ID limpo para impedir que o gradiente fique preto no SVG */}
                <linearGradient
                  id={`gradient-${id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--card-border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--card-border)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#ef4444", fontWeight: "600" }}
                labelStyle={{ color: "var(--text-muted)", marginBottom: "4px" }}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.fullDate || label
                }
              />
              <Area
                type="monotone"
                dataKey="Chats"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#gradient-${id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
