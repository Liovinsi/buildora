import { ImageUpload } from './ui/ImageUpload';
import { Input, Textarea } from './ui/Field';

export const emptyBusinessForm = { name: '', description: '', phone: '', location: '', logo: '' };

export function validateBusinessForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Business name is required';
  const digits = form.phone.replace(/\D/g, '');
  if (!digits) errors.phone = 'Phone number is required';
  else if (digits.length < 10 || digits.length > 15) errors.phone = 'Include the country code, e.g. 91 98765 43210';
  if (form.description.length > 1000) errors.description = 'Keep it under 1000 characters';
  return errors;
}

export function BusinessDetailsFields({ form, setForm, errors = {} }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <div className="space-y-5">
      <ImageUpload
        label="Logo"
        value={form.logo}
        onChange={(logo) => setForm((f) => ({ ...f, logo }))}
        maxSize={400}
        hint="Square image works best. Optional."
      />
      <Input label="Business Name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Uma Fashion" maxLength={80} />
      <Textarea
        label="Business Description"
        value={form.description}
        onChange={set('description')}
        error={errors.description}
        placeholder="What do you sell? What makes it special?"
        maxLength={1000}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Phone Number"
          required
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          placeholder="91 98765 43210"
          hint="WhatsApp number with country code. Customers will message this number."
        />
        <Input label="Location" value={form.location} onChange={set('location')} placeholder="e.g. Chennai, Tamil Nadu" maxLength={120} />
      </div>
    </div>
  );
}
