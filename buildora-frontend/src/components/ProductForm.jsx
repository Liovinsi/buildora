import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea, Toggle } from './ui/Field';
import { ImageUpload } from './ui/ImageUpload';
import { ImageEditor } from './ImageEditor';

const EMPTY = { name: '', description: '', price: '', image: '', imageLabel: '', category: '', available: true };

export function ProductForm({ open, product, onClose, onSubmit, suggestions = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  // The image label follows the product name until the user types their own.
  const [labelTouched, setLabelTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setEditingImage(false);
    const custom = Boolean(product?.imageLabel) && product.imageLabel !== product.name;
    setLabelTouched(custom);
    setForm(
      product
        ? { ...EMPTY, ...product, price: String(product.price ?? ''), imageLabel: custom ? product.imageLabel : product.name }
        : EMPTY
    );
  }, [open, product]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setName = (e) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, ...(!labelTouched && { imageLabel: name }) }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Product name is required';
    const price = Number(form.price);
    if (form.price === '' || !Number.isFinite(price) || price < 0) next.price = 'Enter a valid price';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        image: form.image,
        imageLabel: form.image ? form.imageLabel.trim() || form.name.trim() : '',
        category: form.category.trim(),
        available: form.available,
      });
      onClose();
    } catch {
      // parent shows the toast; keep the modal open so nothing is lost
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={product ? 'Edit product' : 'Add product'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" form="product-form" loading={saving}>{product ? 'Save changes' : 'Add product'}</Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
          <ImageUpload
            label="Photo"
            value={form.image}
            onChange={(image) => setForm((f) => ({ ...f, image }))}
            shape="wide"
            onEdit={() => setEditingImage(true)}
          />
          {form.image && (
            <Input
              label="Image label"
              value={form.imageLabel}
              onChange={(e) => {
                setLabelTouched(true);
                set('imageLabel')(e);
              }}
              hint="Describes the photo for customers and screen readers. Defaults to the product name."
              placeholder={form.name || 'e.g. Blue Silk Saree – front view'}
              maxLength={120}
            />
          )}
          <Input label="Name" required value={form.name} onChange={setName} error={errors.name} placeholder="e.g. Blue Silk Saree" maxLength={120} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Price (₹)" required type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={set('price')} error={errors.price} placeholder="1299" />
            <Input label="Category" value={form.category} onChange={set('category')} placeholder="e.g. Sarees" list="product-categories" maxLength={60} />
            <datalist id="product-categories">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Fabric, size, flavour, delivery time…" maxLength={1000} />
          <Toggle
            label="Available"
            description="Unavailable products are hidden from your store."
            checked={form.available}
            onChange={(available) => setForm((f) => ({ ...f, available }))}
          />
        </form>
      </Modal>
      <ImageEditor
        open={editingImage}
        src={form.image}
        onClose={() => setEditingImage(false)}
        onSave={(image) => {
          setForm((f) => ({ ...f, image }));
          setEditingImage(false);
        }}
      />
    </>
  );
}
