import { useCallback } from 'react';
import { Check, ExternalLink, MessageCircle, Package, Pencil, Plus, Store, Users } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useApi } from '../hooks/useApi';
import { useCategories } from '../hooks/useCategories';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useInterval } from '../hooks/useInterval';
import { businessService } from '../services/businessService';
import { cn } from '../utils/cn';

function SetupStep({ done, title, description, action }) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full border',
          done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-neutral-300 text-transparent'
        )}
      >
        <Check className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-medium', done && 'text-neutral-500 line-through')}>{title}</div>
        <div className="text-xs text-neutral-500">{description}</div>
      </div>
      {!done && action}
    </li>
  );
}

export default function DashboardPage() {
  const { business } = useCurrentBusiness();
  const { getCategory } = useCategories();
  const loadStats = useCallback(() => businessService.stats(business._id), [business._id]);
  const { data: stats, reload } = useApi(loadStats, [loadStats]);
  useInterval(() => reload({ silent: true }), 15000);

  const published = business.store?.published;
  const connected = business.whatsapp?.connected;
  const storeUrl = `/store/${business.slug}`;
  const val = (v) => (stats ? v : '—');

  return (
    <>
      <PageHeader
        title={business.name}
        description={getCategory(business.category)?.name}
        actions={
          published && (
            <Button variant="secondary" href={storeUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open Store
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} label="Products" value={val(stats?.products)} to="/dashboard/products" accent="bg-brand-50 text-brand-600" />
        <StatCard icon={Users} label="Customers" value={val(stats?.customers)} to="/dashboard/inbox" accent="bg-sky-50 text-sky-600" />
        <StatCard icon={MessageCircle} label="Unread Messages" value={val(stats?.unreadMessages)} to="/dashboard/inbox" accent="bg-amber-50 text-amber-600" />
        <StatCard
          icon={MessageCircle}
          label="WhatsApp Status"
          value={connected ? 'Connected' : 'Not Connected'}
          to="/dashboard/whatsapp"
          accent={connected ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Get set up" description="Finish these steps to start taking orders on WhatsApp." />
          <ul className="divide-y divide-neutral-100">
            <SetupStep done title="Create your business" description="Done — nice work!" />
            <SetupStep
              done={Boolean(stats?.products)}
              title="Add your first product"
              description="Photos and prices help customers decide."
              action={<Button size="sm" variant="secondary" to="/dashboard/products?new=1">Add</Button>}
            />
            <SetupStep
              done={published}
              title="Publish your store"
              description="Get a shareable link for your store."
              action={<Button size="sm" variant="secondary" to="/dashboard/store">Set up</Button>}
            />
            <SetupStep
              done={connected}
              title="Connect WhatsApp"
              description="Receive and reply to customer messages here."
              action={<Button size="sm" variant="secondary" to="/dashboard/whatsapp">Connect</Button>}
            />
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Quick actions" />
          <div className="grid gap-2 p-4">
            <Button variant="secondary" className="justify-start" to="/dashboard/products?new=1">
              <Plus className="size-4" /> Add Product
            </Button>
            <Button variant="secondary" className="justify-start" to="/dashboard/store">
              <Pencil className="size-4" /> Edit Store
            </Button>
            <Button variant="secondary" className="justify-start" to="/dashboard/whatsapp">
              <MessageCircle className="size-4" /> {connected ? 'WhatsApp Settings' : 'Connect WhatsApp'}
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              {...(published ? { href: storeUrl, target: '_blank', rel: 'noreferrer' } : { to: '/dashboard/store' })}
            >
              <Store className="size-4" /> {published ? 'Open Store' : 'Open Store (publish first)'}
            </Button>
            <Button variant="secondary" className="justify-start" to="/dashboard/inbox">
              <MessageCircle className="size-4" /> View Inbox
              {stats?.unreadMessages > 0 && (
                <span className="ml-auto rounded-full bg-whatsapp px-2 text-xs text-white">{stats.unreadMessages}</span>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
