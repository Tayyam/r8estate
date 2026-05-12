import { Resend } from 'resend';
import { APP_URL, EMAIL_FROM, RESEND_API_KEY } from './env.js';

let resend: Resend | null = null;

function client(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

export async function sendHtmlEmail(to: string, subject: string, html: string): Promise<void> {
  const r = client();
  const { error } = await r.emails.send({ from: EMAIL_FROM, to: [to], subject, html });
  if (error) throw new Error(error.message);
}

export function verificationEmailHtml(link: string): string {
  const year = new Date().getFullYear();
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #194866;">Verify your email</h1>
      <p>Click the button below to verify your R8 Estate account.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#194866;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Verify email</a>
      </p>
      <p style="word-break:break-all;font-size:12px;color:#666;">${link}</p>
      <p style="font-size:12px;color:#999;">&copy; ${year} R8 Estate</p>
    </div>`;
}

export function passwordResetEmailHtml(link: string): string {
  const year = new Date().getFullYear();
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #194866;">Reset your password</h1>
      <p>Use the link below to set a new password. It expires in 60 minutes.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#194866;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Reset password</a>
      </p>
      <p style="word-break:break-all;font-size:12px;color:#666;">${link}</p>
      <p style="font-size:12px;color:#999;">&copy; ${year} R8 Estate</p>
    </div>`;
}

export function buildAppLink(path: string, token: string): string {
  const u = new URL(path, APP_URL);
  u.searchParams.set('token', token);
  return u.toString();
}
