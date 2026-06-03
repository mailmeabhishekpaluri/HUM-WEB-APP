// Central display-label maps so raw DB enums never leak into the UI.

export const PROGRAMME_LABELS: Record<string, string> = {
  P1_EDUCATION: 'Education Development Program',
  P2_SEL: 'Social Emotional Learning',
  P3_DIGITAL_LITERACY: 'Digital Literacy & AI',
  P4_HEALTH_NUTRITION: 'Health & Nutrition',
  P5_LIBRARY: 'Library Project',
};

// Ordered list for dropdowns (value + label)
export const PROGRAMME_OPTIONS = [
  { value: 'P1_EDUCATION', label: 'Education Development Program' },
  { value: 'P2_SEL', label: 'Social Emotional Learning' },
  { value: 'P3_DIGITAL_LITERACY', label: 'Digital Literacy & AI' },
  { value: 'P4_HEALTH_NUTRITION', label: 'Health & Nutrition' },
  { value: 'P5_LIBRARY', label: 'Library Project' },
];

export const SAFEGUARDING_LEVEL_LABELS: Record<string, string> = {
  NONE_REQUIRED: 'None Required',
  SAFEGUARDING_QUIZ_ONLY: 'Safeguarding Quiz Only',
  POLICE_VERIFICATION_REQUIRED: 'Police Verification Required',
};

export const SAFEGUARDING_LEVEL_OPTIONS = [
  { value: 'NONE_REQUIRED', label: 'None Required' },
  { value: 'SAFEGUARDING_QUIZ_ONLY', label: 'Safeguarding Quiz Only' },
  { value: 'POLICE_VERIFICATION_REQUIRED', label: 'Police Verification Required' },
];

export const PERIOD_LABELS: Record<string, string> = {
  ALL_TIME: 'All Time',
  THIS_MONTH: 'This Month',
};

export const POLICE_STATUS_LABELS: Record<string, string> = {
  NOT_SUBMITTED: 'Not Submitted',
  SUBMITTED_PENDING: 'Submitted — Pending',
  VERIFIED: 'Verified',
};

export const SAFEGUARDING_STATUS_LABELS: Record<string, string> = {
  NOT_ATTEMPTED: 'Not Attempted',
  PASS: 'Passed',
  FAIL: 'Failed',
};

export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  FULL: 'Full',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEACTIVATED: 'Deactivated',
};

/** Generic fallback: SCREAMING_SNAKE_CASE → Title Case */
export function humanize(value?: string | null): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Safe date formatter (IST) — returns '—' for null/invalid dates. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Safe date-time formatter, always rendered in IST regardless of viewer locale. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}
