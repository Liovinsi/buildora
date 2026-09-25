import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50 shadow-xs',
  ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  whatsapp: 'bg-whatsapp text-white hover:bg-[#1fb855] shadow-sm',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, to, href, ...props }) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className
  );
  const content = (
    <>
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </>
  );

  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>;
  if (href) return <a href={href} className={classes} {...props}>{content}</a>;
  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
