import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ImageOff, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { ProductForm } from '../components/ProductForm';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge, EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { useApi } from '../hooks/useApi';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { productService } from '../services/productService';
import { formatPrice } from '../utils/format';

export default function ProductsPage() {
  const { business } = useCurrentBusiness();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const load = useCallback(() => productService.listByBusiness(business._id), [business._id]);
  const { data: products, loading, error, reload, setData } = useApi(load, [load]);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, product = edit
  const [deleting, setDeleting] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const formOpen = editing !== null || params.get('new') === '1';

  const suggestions = useMemo(() => [...new Set((products || []).map((p) => p.category).filter(Boolean))], [products]);

  const closeForm = useCallback(() => {
    setEditing(null);
    if (params.get('new')) setParams({}, { replace: true });
  }, [params, setParams]);

  async function handleSubmit(values) {
    try {
      if (editing?._id) {
        const updated = await productService.update(editing._id, values);
        setData((list) => list.map((p) => (p._id === updated._id ? updated : p)));
        toast.success('Product updated');
      } else {
        const created = await productService.create({ ...values, businessId: business._id });
        setData((list) => [created, ...(list || [])]);
        toast.success('Product added');
      }
    } catch (err) {
      toast.error(err);
      throw err;
    }
  }

  async function toggleAvailable(product) {
    try {
      const updated = await productService.update(product._id, { available: !product.available });
      setData((list) => list.map((p) => (p._id === updated._id ? updated : p)));
    } catch (err) {
      toast.error(err);
    }
  }

  async function confirmDelete() {
    setBusyDelete(true);
    try {
      await productService.remove(deleting._id);
      setData((list) => list.filter((p) => p._id !== deleting._id));
      toast.success('Product deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Products and services shown on your store."
        actions={<Button onClick={() => setEditing({})}><Plus className="size-4" /> Add Product</Button>}
      />

      <Card>
        {loading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !products.length ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product or service. Customers can enquire about it on WhatsApp with one tap."
            action={<Button onClick={() => setEditing({})}><Plus className="size-4" /> Add Product</Button>}
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {products.map((p) => (
              <li key={p._id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {p.image ? (
                    <img src={p.image} alt={p.imageLabel || p.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300"><ImageOff className="size-5" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {!p.available && <Badge tone="amber">Hidden</Badge>}
                  </div>
                  <div className="truncate text-sm text-neutral-500">
                    {formatPrice(p.price)}
                    {p.category && ` · ${p.category}`}
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailable(p)}
                  className="hidden text-xs font-medium text-neutral-500 hover:text-neutral-900 sm:block"
                >
                  {p.available ? 'Hide' : 'Show'}
                </button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ProductForm open={formOpen} product={editing?._id ? editing : null} onClose={closeForm} onSubmit={handleSubmit} suggestions={suggestions} />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete product?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={busyDelete} onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          “{deleting?.name}” will be removed from your store. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
