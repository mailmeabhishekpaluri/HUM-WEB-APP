// The platform is India-only (IST). A `datetime-local` input sends a naive
// string with no timezone (e.g. "2026-06-10T10:00"). `new Date()` would
// interpret that in the SERVER's local timezone — which is UTC on Railway —
// causing a +5:30 shift. Parse such strings explicitly as IST instead.

const IST_OFFSET = '+05:30';

export function parseISTDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Already has a timezone designator (Z or ±HH:MM) → trust it as-is.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  // Naive "YYYY-MM-DDTHH:MM[:SS]" → treat as IST.
  return new Date(`${value}${IST_OFFSET}`);
}
