import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { UserRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { DEMO_CUSTOMER, useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useToast } from '../../hooks/useToast';
import { formatPhone } from '../../utils/format';
import { AuthLayout } from './AuthLayout';

// Only allow in-app redirects after login.
export const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/my-orders');

export default function CustomerLoginPage() {
  const { isLoggedIn, login, loginAsDemo } = useCustomerAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  if (isLoggedIn && !busy) return <Navigate to={next} replace />;

  async function run(kind, fn) {
    setBusy(kind);
    setError('');
    try {
      const customer = await fn();
      toast.success(`Welcome, ${customer.name}`);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <AuthLayout title="Log in" subtitle="Sign in with your phone number to place orders and track them.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!phone.trim()) return setError('Enter your phone number');
          run('login', () => login(phone));
        }}
      >
        <Input label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 91 98765 43210" hint="With country code. No password or OTP in demo mode." error={error} />
        <Button type="submit" className="w-full" loading={busy === 'login'} disabled={Boolean(busy)}>Log in</Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" /> or <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <Button variant="secondary" className="w-full" loading={busy === 'demo'} disabled={Boolean(busy)} onClick={() => run('demo', loginAsDemo)}>
        <UserRound className="size-4" /> Continue as {DEMO_CUSTOMER.name}
      </Button>
      <p className="mt-2 text-center text-xs text-neutral-500">Shared development account ({formatPhone(DEMO_CUSTOMER.phone)})</p>

      <p className="mt-6 text-center text-sm text-neutral-600">
        New here? <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
