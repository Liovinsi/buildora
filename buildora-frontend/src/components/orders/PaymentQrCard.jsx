import { Copy, QrCode, Smartphone } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/format';
import { upiLink } from '../../utils/orders';

// Shown when the shop has no UPI details yet (orders are still accepted, payment stays PENDING).
export function PaymentNotConfigured({ children }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
      <QrCode className="size-6 shrink-0 text-neutral-400" />
      <div className="text-sm">
        <div className="font-semibold text-neutral-800">Payment QR not configured</div>
        <p className="mt-0.5 text-neutral-600">{children || 'This shop hasn’t added its UPI payment details yet.'}</p>
      </div>
    </div>
  );
}

// The shop's UPI QR / ID for manual payment. No gateway: the customer pays in their UPI app.
export function PaymentQrCard({ payment, amount, note }) {
  const toast = useToast();
  if (!payment) return <PaymentNotConfigured />;
  const copy = () => navigator.clipboard.writeText(payment.upiId).then(() => toast.success('UPI ID copied'), () => toast.error('Copy failed'));

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {payment.qrImage ? (
          <img src={payment.qrImage} alt="UPI payment QR code" className="size-44 shrink-0 rounded-xl border border-neutral-200 bg-white object-contain p-2" />
        ) : (
          <div className="flex size-44 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center text-xs text-neutral-500">
            <QrCode className="size-8 text-neutral-300" />
            Payment QR not configured. Pay using the UPI ID.
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          {amount !== undefined && (
            <div>
              <div className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Amount to pay</div>
              <div className="text-2xl font-semibold">{formatPrice(amount)}</div>
            </div>
          )}
          {payment.payeeName && <div className="text-sm text-neutral-600">Pay to <span className="font-medium text-neutral-900">{payment.payeeName}</span></div>}
          {payment.upiId && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5">
              <code className="truncate text-sm">{payment.upiId}</code>
              <button type="button" onClick={copy} className="rounded p-0.5 text-neutral-500 hover:text-neutral-900" aria-label="Copy UPI ID">
                <Copy className="size-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-neutral-500">Scan with Google Pay, PhonePe, Paytm or any UPI app{payment.upiId ? ', or pay to the UPI ID' : ''}.</p>
          {payment.instructions && <p className="text-sm text-neutral-700">{payment.instructions}</p>}
          {payment.upiId && amount !== undefined && (
            <a href={upiLink({ upiId: payment.upiId, payeeName: payment.payeeName, amount, note })} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline sm:hidden">
              <Smartphone className="size-4" /> Open UPI app
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
