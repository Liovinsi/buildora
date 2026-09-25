export const ORDER_FLOW = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const ORDER_STATUS = {
  PLACED: { label: 'Placed', tone: 'brand' },
  CONFIRMED: { label: 'Confirmed', tone: 'brand' },
  PREPARING: { label: 'Preparing', tone: 'amber' },
  READY: { label: 'Ready', tone: 'amber' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'amber' },
  DELIVERED: { label: 'Delivered', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

export const PAYMENT_STATUS = {
  PENDING: { label: 'Payment pending', tone: 'neutral' },
  SUBMITTED: { label: 'Payment submitted', tone: 'amber' },
  VERIFIED: { label: 'Payment verified', tone: 'green' },
  REJECTED: { label: 'Payment rejected', tone: 'red' },
};

export const isFinalStatus = (status) => status === 'DELIVERED' || status === 'CANCELLED';

// Statuses an owner can move to next (forward only, or cancel).
export function nextStatuses(status) {
  if (isFinalStatus(status)) return [];
  return [...ORDER_FLOW.slice(ORDER_FLOW.indexOf(status) + 1), 'CANCELLED'];
}

export const formatOrderDate = (date) =>
  new Date(date).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const itemCount = (order) => order.items.reduce((n, i) => n + i.quantity, 0);

// Standard UPI deep link; opens GPay/PhonePe/Paytm on phones.
export function upiLink({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({ pa: upiId, cu: 'INR' });
  if (payeeName) params.set('pn', payeeName);
  if (amount) params.set('am', Number(amount).toFixed(2));
  if (note) params.set('tn', note);
  return `upi://pay?${params}`;
}

// Delivery address as display lines (older orders only have `address`).
export const addressLines = (d = {}) => [d.address, d.area, [d.city, d.pincode].filter(Boolean).join(' - ')].filter(Boolean);

export const productSummary = (order, max = 2) => {
  const names = order.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name));
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max} more` : names.join(', ');
};
