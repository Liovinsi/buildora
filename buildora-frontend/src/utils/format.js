const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export const formatPrice = (value) => inr.format(Number(value) || 0).replace(/\.00$/, '');

export function formatChatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function formatDay(date) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// "+91 98765 43210" -> "+91 98••• ••210": enough to recognise a number without showing all of it.
export function maskPhone(display) {
  const s = String(display || '');
  const total = (s.match(/\d/g) || []).length;
  if (total < 7) return s;
  const cc = s.trim().startsWith('+') ? (s.match(/^\+\s*(\d{1,3})/)?.[1].length ?? 0) : 0;
  let seen = 0;
  return s.replace(/\d/g, (d) => {
    seen += 1;
    return seen <= cc + 2 || seen > total - 3 ? d : '•';
  });
}

export const formatPhone = (digits) => (digits ? `+${String(digits).replace(/\D/g, '')}` : '');

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
