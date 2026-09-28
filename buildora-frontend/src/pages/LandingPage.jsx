import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SiteFooter } from '../components/SiteFooter';
import { Button } from '../components/ui/Button';
import { FEATURES, STEPS } from '../data/landing';
import { readStorage } from '../utils/storage';

function InboxPreview() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl shadow-neutral-900/5">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">P</div>
        <div>
          <div className="text-sm font-semibold">Priya</div>
          <div className="text-xs text-neutral-500">via WhatsApp</div>
        </div>
      </div>
      <div className="space-y-2 pt-4 text-sm">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-neutral-100 px-3 py-2">Hi, I am interested in Blue Saree.</div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-100 px-3 py-2 text-emerald-950">
          Hi Priya! It's available in silk and cotton. Which would you like?
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-neutral-100 px-3 py-2">Silk please 😊</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const hasBusiness = Boolean(readStorage('buildora.businessId'));

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button variant="ghost" size="sm" to={hasBusiness ? '/dashboard' : '/businesses'}>
          {hasBusiness ? 'Go to dashboard' : 'My businesses'}
        </Button>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-brand-100),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
              <MessageCircle className="size-3.5 text-whatsapp-dark" /> Built for WhatsApp-first businesses
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-neutral-900 sm:text-5xl">
              Turn Your Home Business Into an Online Store
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-neutral-600">
              Create your store, connect WhatsApp, and manage customer conversations from one simple dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" to="/create-business">
                Create Your Business <ArrowRight className="size-4" />
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
              {STEPS.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <InboxPreview />
        </div>
      </section>

      <section className="border-t border-neutral-100 bg-neutral-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Ready to open your store?</h2>
        <p className="mt-3 text-neutral-600">It takes about two minutes. No website skills needed.</p>
        <Button size="lg" to="/create-business" className="mt-8">
          Create Your Business <ArrowRight className="size-4" />
        </Button>
      </section>

      <SiteFooter />
    </div>
  );
}
