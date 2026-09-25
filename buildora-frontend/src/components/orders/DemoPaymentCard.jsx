import { FlaskConical } from 'lucide-react';
import { formatPrice } from '../../utils/format';

// Development-only payment block, used when a shop has no UPI details yet.
// The QR is a decorative, NON-scannable pattern and `demo@upi` is not a real account:
// no money moves, and nothing here claims a payment was verified.
export const DEMO_UPI_ID = 'demo@upi';

const SIZE = 21;
const inFinder = (x, y) => [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
const finderOn = (x, y) => {
  const [fx, fy] = [x < 7 ? 0 : SIZE - 7, y < 7 ? 0 : SIZE - 7];
  const [dx, dy] = [x - fx, y - fy];
  return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
};
const MODULES = [];
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const on = inFinder(x, y) ? finderOn(x, y) : (x * 31 + y * 17 + x * y) % 7 < 3;
    if (on) MODULES.push([x, y]);
  }
}

function DemoQr() {
  return (
    <div className="relative size-44 shrink-0 rounded-xl border border-neutral-200 bg-white p-3" role="img" aria-label="Demo QR code (not scannable)">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full opacity-40" shapeRendering="crispEdges">
        {MODULES.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111" />)}
      </svg>
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-12 bg-amber-400/90 py-1 text-center text-sm font-bold tracking-widest text-amber-950">
        DEMO
      </span>
    </div>
  );
}

export function DemoPaymentCard({ amount }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-5">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
        <FlaskConical className="size-3.5" /> Demo payment · development only · no real money
      </div>
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <DemoQr />
        <div className="space-y-3">
          {amount !== undefined && (
            <div>
              <div className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Amount to pay</div>
              <div className="text-2xl font-semibold">{formatPrice(amount)}</div>
            </div>
          )}
          <div className="text-sm">UPI ID: <code className="rounded bg-white px-1.5 py-0.5 font-medium">{DEMO_UPI_ID}</code></div>
          <p className="text-xs text-amber-900">
            This shop hasn’t added its UPI details yet, so a demo payment block is shown for testing. Don’t send money.
            Enter any test reference to continue; the shop reviews every payment manually.
          </p>
        </div>
      </div>
    </div>
  );
}
