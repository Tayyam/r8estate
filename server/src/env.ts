import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const SUPABASE_URL = req('SUPABASE_URL');
export const SUPABASE_SERVICE_ROLE_KEY = req('SUPABASE_SERVICE_ROLE_KEY');
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'R8 Estate <onboarding@resend.dev>';
export const APP_URL = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
export const PORT = Number(process.env.PORT ?? 8787);
