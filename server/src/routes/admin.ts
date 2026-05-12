import { Router } from 'express';
import type { Response } from 'express';
import { adminClient } from '../supabase.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/users', requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const { email, password, displayName, role } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
      role?: string;
    };
    if (!email || !password || !displayName || !role) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }
    if (!['admin', 'company', 'user'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role },
    });
    if (error || !created.user) throw error ?? new Error('createUser failed');

    await adminClient
      .from('profiles')
      .update({
        displayName,
        role,
        isEmailVerified: true,
        status: 'active',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', created.user.id);

    res.json({
      success: true,
      user: { uid: created.user.id, email, displayName, role },
    });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.delete('/users/:uid', requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.params.uid;
    if (!uid || uid === req.userId) {
      res.status(400).json({ error: 'Invalid user' });
      return;
    }
    await adminClient.auth.admin.deleteUser(uid);
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/users/:uid/password', requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.params.uid;
    const { newPassword } = req.body as { newPassword?: string };
    if (!uid || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    await adminClient.auth.admin.updateUserById(uid, { password: newPassword });
    await adminClient.from('profiles').update({ updatedAt: new Date().toISOString() }).eq('id', uid);
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
