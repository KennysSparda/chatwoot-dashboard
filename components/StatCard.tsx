import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  alert?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function StatCard({ label, value, sub, accent, alert, icon, loading }: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-5 flex flex-col gap-3 transition-colors',
        alert
          ? 'bg-red-500/5 border-red-500/20'
          : accent
          ? 'bg-[#6c5ce7]/5 border-[#6c5ce7]/20'
          : 'bg-[#18181b] border-zinc-800'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        {icon && (
          <span className={clsx('text-base', alert ? 'text-red-400' : accent ? 'text-[#6c5ce7]' : 'text-zinc-600')}>
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
      ) : (
        <span
          className={clsx(
            'text-3xl font-bold tabular-nums',
            alert ? 'text-red-400' : accent ? 'text-[#6c5ce7]' : 'text-white'
          )}
        >
          {value}
        </span>
      )}
      {sub && <span className="text-zinc-600 text-xs">{sub}</span>}
    </div>
  );
}
