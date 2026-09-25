import { Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ORDER_FLOW, ORDER_STATUS, formatOrderDate } from '../../utils/orders';

// Status timeline: completed steps with their time/note, the remaining steps greyed out.
// Steps the owner jumped over are marked "Skipped". A cancelled order shows the steps it
// reached, then "Cancelled".
export function OrderTimeline({ order }) {
  const history = new Map(order.statusHistory.map((h) => [h.status, h]));
  const cancelled = order.status === 'CANCELLED';
  const steps = cancelled
    ? [...ORDER_FLOW.filter((s) => history.has(s)), 'CANCELLED']
    : ORDER_FLOW;
  const reached = ORDER_FLOW.indexOf(order.status); // -1 when cancelled

  return (
    <ol className="space-y-0">
      {steps.map((status, i) => {
        const entry = history.get(status);
        const done = Boolean(entry);
        const isCancel = status === 'CANCELLED';
        const last = i === steps.length - 1;
        const skipped = !done && !isCancel && ORDER_FLOW.indexOf(status) < reached;
        const lineDark = done || skipped;
        return (
          <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className={cn('absolute top-6 left-[11px] h-[calc(100%-1rem)] w-0.5', lineDark ? 'bg-neutral-900' : 'bg-neutral-200')} />}
            <span
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                isCancel ? 'border-red-600 bg-red-600 text-white' : done ? 'border-neutral-900 bg-neutral-900 text-white' : skipped ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-300 bg-white'
              )}
            >
              {isCancel ? <X className="size-3.5" /> : done && <Check className="size-3.5" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className={cn('text-sm font-medium', isCancel ? 'text-red-700' : done ? 'text-neutral-900' : 'text-neutral-400')}>
                {ORDER_STATUS[status].label}
                {skipped && <span className="ml-2 text-xs font-normal text-neutral-400">Skipped</span>}
                {status === order.status && !isCancel && status !== 'DELIVERED' && (
                  <span className="ml-2 text-xs font-normal text-neutral-500">Current</span>
                )}
              </div>
              {entry && <div className="text-xs text-neutral-500">{formatOrderDate(entry.at)}</div>}
              {entry?.note && <div className="mt-0.5 text-sm text-neutral-600">{entry.note}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
