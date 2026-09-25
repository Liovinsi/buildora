import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Globe } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Feedback';
import { Input, Toggle } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useCategories } from '../hooks/useCategories';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { businessService } from '../services/businessService';
import { slugify } from '../utils/slugify';

const COLORS = ['#4f46e5', '#0f766e', '#be185d', '#b45309', '#15803d', '#7c3aed', '#0369a1', '#171717'];

export default function StoreEditorPage() {
  const { business, setBusiness } = useCurrentBusiness();
  const { getCategory } = useCategories();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      slug: business.slug,
      tagline: business.store?.tagline || '',
      themeColor: business.store?.themeColor || COLORS[0],
      published: Boolean(business.store?.published),
    });
  }, [business]);

  if (!form) return null;

  const storePath = `/store/${business.slug}`;
  const storeUrl = `${window.location.origin}${storePath}`;
  const defaultTagline = getCategory(business.category)?.examples.join(' | ');

  async function save(overrides = {}) {
    const next = { ...form, ...overrides };
    if (!slugify(next.slug)) return toast.error('Store URL cannot be empty');
    setSaving(true);
    try {
      const updated = await businessService.update(business._id, {
        slug: next.slug,
        store: { tagline: next.tagline, themeColor: next.themeColor, published: next.published },
      });
      setBusiness(updated);
      toast.success(next.published && !business.store?.published ? 'Your store is live!' : 'Store saved');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success('Store link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  }

  return (
    <>
      <PageHeader
        title="Store"
        description="Your single-page online store. Products are managed on the Products page."
        actions={
          business.store?.published && (
            <Button variant="secondary" href={storePath} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> View store
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {!business.store?.published && (
            <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:flex-row sm:items-center">
              <Globe className="size-8 shrink-0 text-brand-600" />
              <div className="flex-1">
                <div className="font-semibold">Create your store</div>
                <p className="text-sm text-neutral-600">Publish to get a public link you can share on WhatsApp, Instagram and more.</p>
              </div>
              <Button variant="brand" loading={saving} onClick={() => save({ published: true })}>Publish store</Button>
            </div>
          )}

          <Card>
            <CardHeader title="Store details" description="Name, logo and description come from Settings." />
            <form
              className="space-y-5 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <Input
                label="Store URL"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                onBlur={() => setForm((f) => ({ ...f, slug: slugify(f.slug) || business.slug }))}
                hint={`${window.location.origin}/store/${slugify(form.slug) || '…'}`}
              />
              <Input
                label="Tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder={defaultTagline}
                maxLength={120}
                hint="Shown under your business name. Leave empty to use your category examples."
              />
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-neutral-700">Theme colour</span>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, themeColor: c })}
                      className="size-8 rounded-full ring-offset-2 transition"
                      style={{ backgroundColor: c, boxShadow: form.themeColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}
                      aria-label={`Colour ${c}`}
                    />
                  ))}
                </div>
              </div>
              <Toggle
                label="Store published"
                description="When off, visitors see “store not published”."
                checked={form.published}
                onChange={(published) => setForm({ ...form, published })}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save store</Button>
              </div>
            </form>
          </Card>
        </div>

        <Card className="h-fit lg:col-span-2">
          <CardHeader title="Share your store" action={<Badge tone={business.store?.published ? 'green' : 'neutral'}>{business.store?.published ? 'Live' : 'Draft'}</Badge>} />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span className="flex-1 truncate text-sm text-neutral-700">{storeUrl}</span>
              <button onClick={copyLink} className="rounded-md p-1 text-neutral-500 hover:bg-white hover:text-neutral-900" aria-label="Copy link">
                <Copy className="size-4" />
              </button>
            </div>
            <p className="text-sm text-neutral-500">
              Every product has a WhatsApp button that opens a chat with <span className="font-medium text-neutral-700">+{business.phone}</span> and a
              pre-filled message like “Hi, I am interested in Blue Saree.”
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
