import { ImageOff } from 'lucide-react';
import { formatPrice } from '../../utils/format';

export function OrderItems({ items, total }) {
  return (
    <div>
      <ul className="divide-y divide-neutral-100">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 py-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-neutral-300"><ImageOff className="size-4" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{item.name}</div>
              <div className="text-xs text-neutral-500">{item.quantity} × {formatPrice(item.price)}</div>
            </div>
            <div className="text-sm font-medium">{formatPrice(item.lineTotal ?? item.price * item.quantity)}</div>
          </li>
        ))}
      </ul>
      {total !== undefined && (
        <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      )}
    </div>
  );
}
