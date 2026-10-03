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
