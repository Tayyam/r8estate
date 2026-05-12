/** Normalize Firestore Timestamp | ISO string | Date into a Date. */
export function asDate(v: unknown): Date {
  if (v == null) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  const o = v as { toDate?: () => Date; seconds?: number };
  if (typeof o.toDate === 'function') return o.toDate();
  if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
  return new Date();
}
