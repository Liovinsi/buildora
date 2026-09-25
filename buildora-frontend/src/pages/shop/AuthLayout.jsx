import { ShopHeader } from '../../components/shop/ShopHeader';
import { DemoBadge } from '../../components/shop/DemoBadge';

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <ShopHeader />
      <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs sm:p-8">
          <DemoBadge />
          <h1 className="mt-3 text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <span className="font-semibold">Development only.</span> This is a demo customer login: anyone who knows a phone
          number can sign in as that customer. It will be replaced by real authentication before launch.
        </p>
      </div>
    </div>
  );
}
