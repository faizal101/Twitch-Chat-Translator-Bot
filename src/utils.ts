export function normalizeUsername(u: string): string | null {
  if (!u) return null;
  const v = u.replace(/^@+/, '').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,30}$/.test(v)) return null;
  return v;
}
