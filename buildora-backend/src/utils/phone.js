// WhatsApp identifies users by digits-only international numbers (e.g. 919876543210).
export const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

export const isValidPhone = (value) => {
  const digits = normalizePhone(value);
  return digits.length >= 8 && digits.length <= 15;
};
