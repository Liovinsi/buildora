import { Link } from 'react-router';

export function StatCard({ icon: Icon, label, value, to, accent = 'text-neutral-600 bg-neutral-100' }) {
  const body = (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className={`flex size-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-neutral-500">{label}</div>
        <div className="truncate text-xl font-semibold tracking-tight">{value}</div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
