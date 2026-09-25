import { cn } from '../utils/cn';
import { initials } from '../utils/format';

export function BusinessAvatar({ name, logo, className, color }) {
  if (logo) return <img src={logo} alt={name} className={cn('rounded-xl object-cover', className)} />;
  return (
    <div
      className={cn('flex items-center justify-center rounded-xl bg-brand-600 font-semibold text-white', className)}
      style={color ? { backgroundColor: color } : undefined}
    >
      {initials(name)}
    </div>
  );
}
