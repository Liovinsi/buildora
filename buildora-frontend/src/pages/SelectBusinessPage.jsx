import { useNavigate } from 'react-router';
import { Building2, ChevronRight, Plus } from 'lucide-react';
import { Logo } from '../components/Logo';
import { BusinessAvatar } from '../components/BusinessAvatar';
import { WhatsAppStatus } from '../components/WhatsAppStatus';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback';
import { useApi } from '../hooks/useApi';
import { useCategories } from '../hooks/useCategories';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { businessService } from '../services/businessService';

// Demo business picker. Replaced by login + "my businesses" when authentication is added.
export default function SelectBusinessPage() {
  const { data: businesses, loading, error, reload } = useApi(() => businessService.list(), []);
  const { getCategory } = useCategories();
  const { setBusinessId } = useCurrentBusiness();
  const navigate = useNavigate();

  const open = (id) => {
    setBusinessId(id);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your businesses</h1>
            <p className="mt-1 text-sm text-neutral-500">Choose a business to manage.</p>
          </div>
          <Button to="/create-business" size="sm">
            <Plus className="size-4" /> New business
          </Button>
        </div>

        <Card>
          {loading ? (
            <PageLoader />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !businesses?.length ? (
            <EmptyState
              icon={Building2}
              title="No businesses yet"
              description="Create your first business to get your online store."
              action={<Button to="/create-business">Create Your Business</Button>}
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {businesses.map((b) => (
                <li key={b._id}>
                  <button onClick={() => open(b._id)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-neutral-50">
                    <BusinessAvatar name={b.name} logo={b.logo} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{b.name}</div>
                      <div className="truncate text-sm text-neutral-500">{getCategory(b.category)?.name || b.category}</div>
                    </div>
                    <WhatsAppStatus connected={b.whatsapp?.connected} className="hidden text-neutral-500 sm:inline-flex" />
                    <ChevronRight className="size-4 text-neutral-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
