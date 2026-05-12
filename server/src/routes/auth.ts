import { Router } from 'express';
import type { Response } from 'express';
import { adminClient } from '../supabase.js';
import { storeMagicToken, consumeMagicToken } from '../tokens.js';
import { sendHtmlEmail, verificationEmailHtml, passwordResetEmailHtml, buildAppLink } from '../mail.js';
import { syncProfileAfterEmailVerified } from '../claimAfterVerify.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/send-verification-by-email', async (req, res) => {
  try {
    const email = String((req.body as { email?: string })?.email || '').trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Email required' });
      return;
    }
    const { data: prof } = await adminClient.from('profiles').select('id, isEmailVerified').eq('email', email).maybeSingle();
    if (!prof?.id || prof.isEmailVerified) {
      res.json({ success: true });
      return;
    }
    const raw = await storeMagicToken(prof.id, 'email_verify', 60 * 60 * 1000);
    const link = buildAppLink('/verification', raw);
    await sendHtmlEmail(email, 'Verify your R8 Estate email', verificationEmailHtml(link));
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/send-verification', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const raw = await storeMagicToken(req.userId, 'email_verify', 60 * 60 * 1000);
    const { data: u } = await adminClient.auth.admin.getUserById(req.userId);
    const email = u.user?.email;
    if (!email) {
      res.status(400).json({ error: 'No email on account' });
      return;
    }
    const link = buildAppLink('/verification', raw);
    await sendHtmlEmail(email, 'Verify your R8 Estate email', verificationEmailHtml(link));
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token) {
      res.status(400).json({ error: 'Missing token' });
      return;
    }
    const row = await consumeMagicToken(token, 'email_verify');
    if (!row) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }
    await adminClient.auth.admin.updateUserById(row.userId, { email_confirm: true });
    await syncProfileAfterEmailVerified(row.userId);
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String((req.body as { email?: string })?.email || '').trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Email required' });
      return;
    }
    const { data: prof } = await adminClient.from('profiles').select('id').eq('email', email).maybeSingle();
    if (!prof?.id) {
      res.json({ success: true });
      return;
    }
    const raw = await storeMagicToken(prof.id, 'password_reset', 60 * 60 * 1000);
    const link = buildAppLink('/reset-password', raw);
    await sendHtmlEmail(email, 'Reset your R8 Estate password', passwordResetEmailHtml(link));
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    const row = await consumeMagicToken(token, 'password_reset');
    if (!row) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }
    await adminClient.auth.admin.updateUserById(row.userId, { password: newPassword });
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/change-email', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { newEmail } = req.body as { newEmail?: string };
    if (!newEmail || !req.userId) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    await adminClient.auth.admin.updateUserById(req.userId, { email: newEmail, email_confirm: false });
    await adminClient
      .from('profiles')
      .update({
        email: newEmail,
        isEmailVerified: false,
        status: 'not-active',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', req.userId);

    const raw = await storeMagicToken(req.userId, 'email_verify', 60 * 60 * 1000);
    const link = buildAppLink('/verification', raw);
    await sendHtmlEmail(newEmail, 'Verify your new R8 Estate email', verificationEmailHtml(link));
    res.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
