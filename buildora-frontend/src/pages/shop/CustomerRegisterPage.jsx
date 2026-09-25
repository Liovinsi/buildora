import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useToast } from '../../hooks/useToast';
import { AuthLayout } from './AuthLayout';
import { safeNext } from './CustomerLoginPage';

export default function CustomerRegisterPage() {
  const { isLoggedIn, register } = useCustomerAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (isLoggedIn && !busy) return <Navigate to={next} replace />;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (form.phone.replace(/\D/g, '').length < 8) nextErrors.phone = 'Enter a valid phone number with country code';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      const customer = await register({ name: form.name.trim(), phone: form.phone, email: form.email.trim() });
      toast.success(`Welcome, ${customer.name}`);
      navigate(next, { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Save your orders and track their status.">
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Input label="Full name" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
        <Input label="Phone number" required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="e.g. 91 98765 43210" hint="With country code." />
        <Input label="Email (optional)" type="email" autoComplete="email" value={form.email} onChange={set('email')} maxLength={120} />
        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-brand-600 hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
