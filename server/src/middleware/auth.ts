import type { Request, Response, NextFunction } from 'express';
import { adminClient } from '../supabase.js';

export type AuthedRequest = Request & {
  userId?: string;
  accessToken?: string;
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  req.userId = data.user.id;
  req.accessToken = token;
  next();
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  req.userId = data.user.id;
  req.accessToken = token;

  const { data: prof, error: pe } = await adminClient.from('profiles').select('role').eq('id', req.userId).maybeSingle();
  if (pe || prof?.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
}
