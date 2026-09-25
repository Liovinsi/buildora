import { cn } from '../utils/cn';

export function WhatsAppStatus({ connected, className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span className={cn('size-2 rounded-full', connected ? 'bg-whatsapp' : 'bg-neutral-300')} />
      {connected ? 'Connected' : 'Not Connected'}
    </span>
  );
}
