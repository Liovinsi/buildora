import { Check } from 'lucide-react';
import { getCategoryIcon } from '../data/categoryIcons';
import { cn } from '../utils/cn';

export function CategoryPicker({ categories, value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {categories.map((c) => {
        const Icon = getCategoryIcon(c.icon);
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={selected}
            className={cn(
              'relative flex flex-col items-start gap-3 rounded-2xl border bg-white p-4 text-left transition-all',
              selected
                ? 'border-brand-600 ring-2 ring-brand-600/15'
                : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
            )}
          >
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl',
                selected ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-600'
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">{c.name}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-neutral-500">{c.description}</div>
            </div>
            {selected && (
              <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
