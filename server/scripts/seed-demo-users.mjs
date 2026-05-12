/**
 * One-off: create demo accounts for admin / company / user (self-hosted Supabase).
 * Run from server directory: node scripts/seed-demo-users.mjs
 */
import 'dotenv/config';
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';

globalThis.WebSocket = WebSocket;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? 'R8Demo!2026';

const users = [
  { email: 'demo-admin@r8estate.duckdns.org', displayName: 'Demo Admin', role: 'admin' },
  { email: 'demo-company@r8estate.duckdns.org', displayName: 'Demo Company', role: 'company' },
  { email: 'demo-user@r8estate.duckdns.org', displayName: 'Demo User', role: 'user' },
];

for (const u of users) {
  const { data: existing } = await admin.from('profiles').select('id').eq('email', u.email).maybeSingle();
  if (existing?.id) {
    await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
    await admin
      .from('profiles')
      .update({
        displayName: u.displayName,
        role: u.role,
        isEmailVerified: true,
        status: 'active',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existing.id);
    console.log('updated', u.email, u.role);
    continue;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: u.displayName, role: u.role },
  });
  if (error) {
    console.error('createUser failed', u.email, error.message);
    process.exit(1);
  }
  if (!created.user) {
    console.error('no user', u.email);
    process.exit(1);
  }

  const { error: pe } = await admin
    .from('profiles')
    .update({
      displayName: u.displayName,
      role: u.role,
      isEmailVerified: true,
      status: 'active',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', created.user.id);

  if (pe) {
    console.error('profile update', u.email, pe.message);
    process.exit(1);
  }
  console.log('created', u.email, u.role);
}

console.log('Done. Password for all:', DEMO_PASSWORD);
