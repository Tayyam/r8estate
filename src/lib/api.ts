const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const { accessToken, ...rest } = init;
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(apiUrl(path), { ...rest, headers });
}
