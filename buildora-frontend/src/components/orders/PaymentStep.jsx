import { useState } from 'react';
import { CircleCheck, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { ImageUpload } from '../ui/ImageUpload';
import { DemoPaymentCard } from './DemoPaymentCard';
import { PaymentQrCard } from './PaymentQrCard';

export const MIN_REFERENCE = 4;

/**
 * Manual UPI payment confirmation (Phase 1, no gateway):
 * show QR (the shop's, or a labelled demo block) -> customer pays -> "I have paid" + reference
 * -> value.status becomes 'SUBMITTED'. Nothing is verified here; the shop verifies manually.
 *
 * value: { status: 'PENDING' | 'SUBMITTED', reference, screenshot }
 */
export function PaymentStep({ payment, demo, amount, note, value, onChange }) {
  const [error, setError] = useState('');
  const submitted = value.status === 'SUBMITTED';

  function confirmPaid() {
    const reference = value.reference.trim();
    if (reference.length < MIN_REFERENCE) {
      setError('Enter the payment reference (UPI transaction ID) from your UPI app');
      return;
    }
    setError('');
    onChange({ ...value, reference, status: 'SUBMITTED' });
  }

  if (submitted) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold text-emerald-900">Payment submitted</div>
          <div className="text-emerald-800">Reference: <span className="font-mono font-medium">{value.reference}</span>{value.screenshot && ' · screenshot attached'}</div>
          <div className="mt-1 text-xs text-emerald-700">The shop will verify it manually{demo ? ' (demo payment, no real money)' : ''}.</div>
        </div>
        <button type="button" onClick={() => onChange({ ...value, status: 'PENDING' })} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline">
          <Pencil className="size-3.5" /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {demo ? <DemoPaymentCard amount={amount} /> : <PaymentQrCard payment={payment} amount={amount} note={note} />}
      <Input
        label="Payment reference (UPI transaction ID)"
        required
        value={value.reference}
        onChange={(e) => {
          onChange({ ...value, reference: e.target.value });
          if (error) setError('');
        }}
        error={error}
        maxLength={100}
        placeholder={demo ? 'e.g. DEMO-12345' : 'e.g. 412345678901'}
        hint={error ? undefined : 'Shown in your UPI app after the payment.'}
      />
      <ImageUpload label="Payment screenshot (optional)" value={value.screenshot} onChange={(screenshot) => onChange({ ...value, screenshot })} hint="PNG or JPG of the payment confirmation." />
      <Button type="button" variant="whatsapp" onClick={confirmPaid}>
        <CircleCheck className="size-4" /> I have paid
      </Button>
    </div>
  );
}
