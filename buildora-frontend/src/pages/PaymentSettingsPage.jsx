import { useEffect, useState } from 'react';
import { PaymentQrCard } from '../components/orders/PaymentQrCard';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Field';
import { ImageUpload } from '../components/ui/ImageUpload';
import { PageHeader } from '../components/ui/PageHeader';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { businessService } from '../services/businessService';

const UPI_ID_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export default function PaymentSettingsPage() {
  const { business, setBusiness } = useCurrentBusiness();
  const toast = useToast();
  const [form, setForm] = useState({ upiId: '', payeeName: '', qrImage: '', instructions: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = business.payment || {};
    setForm({ upiId: p.upiId || '', payeeName: p.payeeName || business.name, qrImage: p.qrImage || '', instructions: p.instructions || '' });
  }, [business]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const next = {};
    if (form.upiId.trim() && !UPI_ID_RE.test(form.upiId.trim())) next.upiId = 'Enter a valid UPI ID, e.g. yourname@okaxis';
    if (!form.upiId.trim() && !form.qrImage) next.upiId = 'Add a UPI ID or upload your payment QR code';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      setBusiness(await businessService.updatePaymentSettings(business._id, { ...form, upiId: form.upiId.trim() }));
      toast.success('Payment settings saved');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  const preview = form.upiId.trim() || form.qrImage ? { ...form, upiId: form.upiId.trim() } : null;

  return (
    <>
      <PageHeader title="Payments" description="Customers pay you directly by UPI. You confirm each payment manually on the order." />
      {!business.store?.published && (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your store isn’t published yet. Customers can order once it’s published and payments are set up.</p>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="UPI details" description="Google Pay, PhonePe, Paytm or any UPI app." />
          <form onSubmit={save} className="space-y-5 p-5" noValidate>
            <Input label="UPI ID" value={form.upiId} onChange={set('upiId')} error={errors.upiId} placeholder="e.g. umafashion@okaxis" maxLength={100} autoComplete="off" />
            <Input label="Payee name" value={form.payeeName} onChange={set('payeeName')} maxLength={80} hint="The name customers should see in their UPI app." />
            <ImageUpload label="Payment QR code" value={form.qrImage} onChange={(qrImage) => setForm((f) => ({ ...f, qrImage }))} maxSize={512} hint="Download it from your UPI app (e.g. GPay → Profile → QR code)." />
            <Textarea label="Payment instructions (optional)" value={form.instructions} onChange={set('instructions')} maxLength={300} placeholder="e.g. Add your name in the payment note." />
            <Button type="submit" loading={saving}>Save payment settings</Button>
          </form>
        </Card>
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Customer preview</h2>
          {preview ? <PaymentQrCard payment={preview} amount={1299} /> : <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">Add a UPI ID or QR code to see the preview.</p>}
        </div>
      </div>
    </>
  );
}
