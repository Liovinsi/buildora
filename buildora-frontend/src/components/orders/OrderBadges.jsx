import { Badge } from '../ui/Feedback';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../utils/orders';

export function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'neutral' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, tone: 'neutral' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
