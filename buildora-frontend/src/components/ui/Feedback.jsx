import { CircleAlert, LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export function Spinner({ className }) {
  return <LoaderCircle className={cn('size-5 animate-spin text-neutral-400', className)} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-neutral-500">
      <Spinner className="size-6" />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <CircleAlert className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-900">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{error?.message || String(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Badge({ tone = 'neutral', className, children }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-transparent ring-inset', tones[tone], className)}>
      {children}
    </span>
  );
}
