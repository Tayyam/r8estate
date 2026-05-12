import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { adminClient } from '../supabase.js';
import { runClaimProcessDomain, runClaimProcessNonDomain } from '../claimService.js';
import { requireAdmin } from '../middleware/auth.js';
import type { AuthedRequest } from '../middleware/auth.js';

const router = Router();

async function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  const { data, error } = await adminClient.auth.getUser(token);
  if (!error && data.user) {
    req.userId = data.user.id;
    req.accessToken = token;
  }
  next();
}

router.post('/domain', optionalAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const body = req.body as {
      businessEmail?: string;
      supervisorEmail?: string;
      companyId?: string;
      companyName?: string;
      contactPhone?: string;
      displayName?: string;
    };
    if (!body.businessEmail || !body.supervisorEmail || !body.companyId || !body.companyName) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const out = await runClaimProcessDomain({
      ...body,
      requesterId: req.userId ?? null,
    } as Parameters<typeof runClaimProcessDomain>[0]);
    res.json(out);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes('already claimed')) res.status(409).json({ error: msg });
    else if (msg.includes('not found')) res.status(404).json({ error: msg });
    else {
      console.error(e);
      res.status(500).json({ error: msg });
    }
  }
});

router.post('/non-domain', requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const { claimRequestId } = req.body as { claimRequestId?: string };
    if (!claimRequestId) {
      res.status(400).json({ error: 'claimRequestId required' });
      return;
    }
    const out = await runClaimProcessNonDomain(claimRequestId);
    res.json(out);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes('already claimed')) res.status(409).json({ error: msg });
    else if (msg.includes('not found')) res.status(404).json({ error: msg });
    else {
      console.error(e);
      res.status(500).json({ error: msg });
    }
  }
});

export default router;
