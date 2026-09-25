import { cn } from '../../utils/cn';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-2xl border border-neutral-200 bg-white shadow-xs', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
