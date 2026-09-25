import { useId } from 'react';
import { cn } from '../../utils/cn';

const inputBase =
  'w-full rounded-lg border bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({ label, hint, error, required, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(inputBase, 'h-10', error ? 'border-red-300' : 'border-neutral-200')}
          {...props}
        />
      )}
    </Field>
  );
}

export function Textarea({ label, hint, error, required, className, rows = 3, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={Boolean(error)}
          className={cn(inputBase, 'py-2.5 resize-y', error ? 'border-red-300' : 'border-neutral-200')}
          {...props}
        />
      )}
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {description && <span className="block text-xs text-neutral-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-neutral-300'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </label>
  );
}
