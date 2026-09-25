import { useEffect, useState } from 'react';
import { BusinessDetailsFields, validateBusinessForm } from '../components/BusinessDetailsFields';
import { CategoryPicker } from '../components/CategoryPicker';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useCategories } from '../hooks/useCategories';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { businessService } from '../services/businessService';

const fromBusiness = (b) => ({
  name: b.name || '',
  description: b.description || '',
  phone: b.phone || '',
  location: b.location || '',
  logo: b.logo || '',
  category: b.category,
});

export default function SettingsPage() {
  const { business, setBusiness } = useCurrentBusiness();
  const { categories } = useCategories();
  const toast = useToast();
  const [form, setForm] = useState(() => fromBusiness(business));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(fromBusiness(business)), [business]);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = validateBusinessForm(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      setBusiness(await businessService.update(business._id, form));
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Business details shown on your store." />
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card>
          <CardHeader title="Business details" />
          <div className="p-5">
            <BusinessDetailsFields form={form} setForm={setForm} errors={errors} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Category" />
          <div className="p-5">
            <CategoryPicker categories={categories} value={form.category} onChange={(category) => setForm({ ...form, category })} />
          </div>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>Save settings</Button>
        </div>
      </form>
    </>
  );
}
