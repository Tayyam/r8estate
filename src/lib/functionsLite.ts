import { supabase } from '../config/supabase';
import { apiFetch } from './api';

export function httpsCallable(_functions: unknown, name: string) {
  return async (payload?: Record<string, unknown>) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token ?? '';

    if (name === 'createUser') {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error((j as { error?: string }).error || 'createUser failed');
      return { data: j };
    }

    if (name === 'deleteUser') {
      const uid = payload?.uid as string;
      const res = await apiFetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
        method: 'DELETE',
        accessToken: token,
      });
      const j = await res.json();
      if (!res.ok) throw new Error((j as { error?: string }).error || 'deleteUser failed');
      return { data: j };
    }

    if (name === 'changeUserPassword') {
      const uid = payload?.uid as string;
      const res = await apiFetch(`/api/admin/users/${encodeURIComponent(uid)}/password`, {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify({ newPassword: payload?.newPassword }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error((j as { error?: string }).error || 'changeUserPassword failed');
      return { data: j };
    }

    if (name === 'claimProcess') {
      const res = await apiFetch('/api/claims/domain', {
        method: 'POST',
        accessToken: token || undefined,
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error((j as { error?: string }).error || 'claimProcess failed');
      return { data: j };
    }

    if (name === 'claimProcessNonDomain') {
      const res = await apiFetch('/api/claims/non-domain', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error((j as { error?: string }).error || 'claimProcessNonDomain failed');
      return { data: j };
    }

    throw new Error(`Unknown function: ${name}`);
  };
}
