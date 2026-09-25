import { FlaskConical } from 'lucide-react';
import { cn } from '../../utils/cn';

// Marks the Phase 1 demo customer login so nobody mistakes it for production auth.
export function DemoBadge({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-amber-800 uppercase', className)}>
      <FlaskConical className="size-3" /> Demo Login
    </span>
  );
}
