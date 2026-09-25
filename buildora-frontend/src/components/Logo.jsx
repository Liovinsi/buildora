import { Link } from 'react-router';

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold tracking-tight text-neutral-900">
      <img src="/favicon.svg" alt="" className="size-7" />
      Buildora
    </Link>
  );
}
