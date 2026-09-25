import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { CategoryPicker } from '../components/CategoryPicker';
import { BusinessDetailsFields, emptyBusinessForm, validateBusinessForm } from '../components/BusinessDetailsFields';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState, PageLoader } from '../components/ui/Feedback';
import { getCategoryIcon } from '../data/categoryIcons';
import { useCategories } from '../hooks/useCategories';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { businessService } from '../services/businessService';

export default function CreateBusinessPage() {
  const { categories, loading, error, getCategory } = useCategories();
  const [category, setCategory] = useState('');
  const [step, setStep] = useState('category');
  const [form, setForm] = useState(emptyBusinessForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { setBusinessId } = useCurrentBusiness();
  const navigate = useNavigate();
  const toast = useToast();

  const selected = getCategory(category);
  const SelectedIcon = selected && getCategoryIcon(selected.icon);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = validateBusinessForm(form);
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const business = await businessService.create({ ...form, category });
      setBusinessId(business._id);
      toast.success(`${business.name} is ready!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-medium text-brand-600">Step {step === 'category' ? 1 : 2} of 2</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create Your Business</h1>
          <p className="mt-2 text-neutral-500">
            {step === 'category' ? 'What kind of business do you run?' : 'Tell customers a little about your business.'}
          </p>
        </div>

        {loading ? (
          <PageLoader label="Loading categories…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => window.location.reload()} />
        ) : step === 'category' ? (
          <>
            <CategoryPicker categories={categories} value={category} onChange={setCategory} />
            <div className="mt-8 flex justify-end">
              <Button size="lg" disabled={!category} onClick={() => setStep('details')}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => setStep('category')}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
            >
              <ArrowLeft className="size-4" /> Change category
            </button>
            <Card className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <SelectedIcon className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{selected.name}</div>
                  <div className="text-xs text-neutral-500">{selected.examples.join(' · ')}</div>
                </div>
              </div>
              <form onSubmit={handleSubmit} noValidate>
                <BusinessDetailsFields form={form} setForm={setForm} errors={errors} />
                <Button type="submit" size="lg" loading={saving} className="mt-8 w-full">
                  Create Business
                </Button>
              </form>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
