/**
 * Enrollment form field validators.
 * Each returns { valid: boolean, message: string }.
 * A blank message means the field is empty / not yet validated.
 */

export const validateLRN = (value) => {
  const v = (value || '').trim();
  if (!v) return { valid: false, message: '' };
  if (!/^\d+$/.test(v)) return { valid: false, message: 'LRN must contain only digits' };
  if (v.length !== 12) return { valid: false, message: `LRN must be exactly 12 digits (${v.length}/12)` };
  return { valid: true, message: '' };
};

export const validateEmail = (value) => {
  const v = (value || '').trim();
  if (!v) return { valid: false, message: '' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { valid: false, message: 'Enter a valid email address' };
  return { valid: true, message: '' };
};

export const validatePhone = (value) => {
  const v = (value || '').replace(/[\s\-()]/g, '');
  if (!v) return { valid: false, message: '' };
  if (!/^\+?\d{7,15}$/.test(v)) return { valid: false, message: 'Enter a valid phone number (7-15 digits)' };
  return { valid: true, message: '' };
};

export const validateAge = (dob, minAge = 10) => {
  if (!dob) return { valid: false, age: 0, message: '' };
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < minAge) return { valid: false, age, message: `Applicant must be at least ${minAge} years old (current: ${age})` };
  return { valid: true, age, message: '' };
};

export const validateRequired = (value, fieldName = 'This field') => {
  const v = (value || '').trim();
  if (!v) return { valid: false, message: `${fieldName} is required` };
  return { valid: true, message: '' };
};

export const validateName = (value, fieldName = 'Name') => {
  const base = validateRequired(value, fieldName);
  if (!base.valid) return base;
  if (/\d/.test(value.trim())) return { valid: false, message: `${fieldName} should not contain numbers` };
  return { valid: true, message: '' };
};

/** Format a file size in human-readable form. */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

/** Check if a file is an image based on its type or extension. */
export const isImageFile = (file) => {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name || '');
};

/** Check if a file is a PDF. */
export const isPdfFile = (file) => {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
};
