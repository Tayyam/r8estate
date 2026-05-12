import crypto from 'crypto';
import { adminClient } from './supabase.js';

export function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function storeMagicToken(
  userId: string,
  purpose: 'email_verify' | 'password_reset',
  ttlMs: number
): Promise<string> {
  const raw = randomToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const { error } = await adminClient.from('auth_magic_tokens').insert({
    tokenHash,
    userId,
    purpose,
    expiresAt,
    consumed: false,
  });
  if (error) throw error;
  return raw;
}

export async function consumeMagicToken(
  raw: string,
  purpose: 'email_verify' | 'password_reset'
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(raw);
  const { data: rows, error } = await adminClient
    .from('auth_magic_tokens')
    .select('id, userId, expiresAt, consumed, purpose')
    .eq('tokenHash', tokenHash)
    .eq('purpose', purpose)
    .maybeSingle();

  if (error || !rows || rows.consumed) return null;
  if (new Date(rows.expiresAt) < new Date()) return null;

  await adminClient.from('auth_magic_tokens').update({ consumed: true }).eq('id', rows.id);
  return { userId: rows.userId as string };
}
