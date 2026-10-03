export const formatMoney = (amount) => {
  const n = Number(amount) || 0;
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const termLabel = (name) =>
  (name || '').replace('TERM_', 'Term ');

export const audienceLabel = (a) =>
  ({ ALL: 'Whole school', STAFF: 'Staff only', CLASS: 'One class' }[a] || a);

export const initial = (name) => (name || '?').charAt(0).toUpperCase();

export const ordinalSuffixClient = (n) => {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Platform Admin',
  OWNER: 'Proprietor / Owner',
  ADMIN: 'Administrator (legacy)',
  HEADTEACHER: 'Headteacher',
  DEPUTY_HEAD: 'Deputy Head',
  ACADEMIC_COORDINATOR: 'Academic Coordinator',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant / Bursar',
  SECRETARY: 'Secretary / Administrator',
  SUPPORT_STAFF: 'Support Staff',
  PARENT: 'Parent / Guardian',
};

export const STAFF_ROLE_OPTIONS = [
  'HEADTEACHER',
  'DEPUTY_HEAD',
  'ACADEMIC_COORDINATOR',
  'TEACHER',
  'ACCOUNTANT',
  'SECRETARY',
  'SUPPORT_STAFF',
  'OWNER',
];
