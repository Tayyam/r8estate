import { adminClient } from './supabase.js';
import { storeMagicToken } from './tokens.js';
import { buildAppLink, sendHtmlEmail } from './mail.js';

function randomDigits(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

function randomPassword9(): string {
  return randomDigits(9);
}

async function sendClaimVerificationEmails(params: {
  businessEmail: string;
  supervisorEmail: string;
  companyName: string;
  randomPassword: string;
  supervisorPassword: string;
  businessUserId: string;
  supervisorUserId: string;
}): Promise<void> {
  const ttl = 7 * 24 * 60 * 60 * 1000;
  const bizToken = await storeMagicToken(params.businessUserId, 'email_verify', ttl);
  const supToken = await storeMagicToken(params.supervisorUserId, 'email_verify', ttl);
  const bizLink = buildAppLink('/verification', bizToken);
  const supLink = buildAppLink('/verification', supToken);
  const year = new Date().getFullYear();

  const htmlBiz = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #194866;">Verify your business email</h1>
      <p>You're claiming <strong>${params.companyName}</strong> on R8 Estate.</p>
      <p><strong>Login</strong></p>
      <div style="background:#f3f4f6;padding:15px;border-radius:5px;margin:16px 0;">
        <p><strong>Email:</strong> ${params.businessEmail}</p>
        <p><strong>Password:</strong> ${params.randomPassword}</p>
      </div>
      <p style="text-align:center;margin:24px 0;">
        <a href="${bizLink}" style="background:#194866;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Verify email</a>
      </p>
      <p style="word-break:break-all;font-size:12px;">${bizLink}</p>
      <p>&copy; ${year} R8 Estate</p>
    </div>`;

  const htmlSup = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #194866;">Supervisor verification</h1>
      <p><strong>${params.companyName}</strong> needs your confirmation.</p>
      <p><strong>Login</strong></p>
      <div style="background:#f3f4f6;padding:15px;border-radius:5px;margin:16px 0;">
        <p><strong>Email:</strong> ${params.supervisorEmail}</p>
        <p><strong>Password:</strong> ${params.supervisorPassword}</p>
      </div>
      <p style="text-align:center;margin:24px 0;">
        <a href="${supLink}" style="background:#194866;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Verify email</a>
      </p>
      <p style="word-break:break-all;font-size:12px;">${supLink}</p>
      <p>&copy; ${year} R8 Estate</p>
    </div>`;

  await sendHtmlEmail(params.businessEmail, `Verify your email — ${params.companyName}`, htmlBiz);
  await sendHtmlEmail(params.supervisorEmail, `Supervisor verification — ${params.companyName}`, htmlSup);
}

export async function runClaimProcessDomain(input: {
  businessEmail: string;
  supervisorEmail: string;
  companyId: string;
  companyName: string;
  contactPhone?: string;
  displayName?: string;
  requesterId?: string | null;
}): Promise<{ success: boolean; trackingNumber: string }> {
  const randomPassword = randomPassword9();
  const supervisorPassword = randomPassword9();
  const trackingNumber = randomDigits(6);

  const { data: company, error: ce } = await adminClient.from('companies').select('id, claimed').eq('id', input.companyId).maybeSingle();
  if (ce || !company) throw new Error('Company not found');
  if (company.claimed) throw new Error('Company already claimed');

  const { data: claimRow, error: insE } = await adminClient
    .from('claimRequests')
    .insert({
      companyId: input.companyId,
      companyName: input.companyName,
      requesterId: input.requesterId ?? null,
      requesterName: input.displayName || 'Guest User',
      businessEmail: input.businessEmail,
      supervisorEmail: input.supervisorEmail,
      contactPhone: input.contactPhone || '',
      password: randomPassword,
      supervisorPassword,
      status: 'pending',
      trackingNumber,
      businessEmailVerified: false,
      supervisorEmailVerified: false,
      domainVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insE || !claimRow) throw new Error(insE?.message || 'Failed to create claim');

  const claimId = claimRow.id as string;

  try {
    const { data: bu, error: bue } = await adminClient.auth.admin.createUser({
      email: input.businessEmail,
      password: randomPassword,
      email_confirm: false,
      user_metadata: {
        display_name: input.displayName || input.companyName,
        role: 'user',
      },
    });
    if (bue || !bu.user) throw bue ?? new Error('Failed to create business user');

    const { data: su, error: sue } = await adminClient.auth.admin.createUser({
      email: input.supervisorEmail,
      password: supervisorPassword,
      email_confirm: false,
      user_metadata: {
        display_name: `${input.displayName || input.companyName} (Supervisor)`,
        role: 'user',
      },
    });
    if (sue || !su.user) throw sue ?? new Error('Failed to create supervisor user');

    const businessUserId = bu.user.id;
    const supervisorUserId = su.user.id;

    await adminClient
      .from('profiles')
      .update({
        claimRequestId: claimId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', businessUserId);

    await adminClient
      .from('profiles')
      .update({
        claimRequestId: claimId,
        isSupervisor: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', supervisorUserId);

    await adminClient
      .from('claimRequests')
      .update({
        userId: businessUserId,
        supervisorId: supervisorUserId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', claimId);

    await sendClaimVerificationEmails({
      businessEmail: input.businessEmail,
      supervisorEmail: input.supervisorEmail,
      companyName: input.companyName,
      randomPassword,
      supervisorPassword,
      businessUserId,
      supervisorUserId,
    });

    return { success: true, trackingNumber };
  } catch (e) {
    console.error(e);
    await adminClient.from('claimRequests').delete().eq('id', claimId);
    throw e;
  }
}

export async function runClaimProcessNonDomain(claimRequestId: string): Promise<{ success: boolean; trackingNumber: string }> {
  const { data: cr, error } = await adminClient.from('claimRequests').select('*').eq('id', claimRequestId).maybeSingle();
  if (error || !cr) throw new Error('Claim request not found');

  const businessEmail = cr.businessEmail as string;
  const supervisorEmail = cr.supervisorEmail as string;
  const companyId = cr.companyId as string;
  const companyName = cr.companyName as string;
  const contactPhone = (cr.contactPhone as string) || '';
  const requesterName = (cr.requesterName as string) || companyName;
  const trackingNumber = (cr.trackingNumber as string) || randomDigits(6);
  const randomPassword = (cr.password as string) || randomPassword9();
  const supervisorPassword = (cr.supervisorPassword as string) || randomPassword9();

  const { data: company, error: ce } = await adminClient.from('companies').select('id, claimed').eq('id', companyId).maybeSingle();
  if (ce || !company) throw new Error('Company not found');
  if (company.claimed) throw new Error('Company already claimed');

  if (cr.userId && cr.supervisorId) {
    await sendClaimVerificationEmails({
      businessEmail,
      supervisorEmail,
      companyName,
      randomPassword,
      supervisorPassword,
      businessUserId: cr.userId as string,
      supervisorUserId: cr.supervisorId as string,
    });
    return { success: true, trackingNumber };
  }

  const { data: bu, error: bue } = await adminClient.auth.admin.createUser({
    email: businessEmail,
    password: randomPassword,
    email_confirm: false,
    user_metadata: { display_name: requesterName, role: 'user' },
  });
  if (bue || !bu.user) throw bue ?? new Error('Failed to create business user');

  const { data: su, error: sue } = await adminClient.auth.admin.createUser({
    email: supervisorEmail,
    password: supervisorPassword,
    email_confirm: false,
    user_metadata: { display_name: `${requesterName} (Supervisor)`, role: 'user' },
  });
  if (sue || !su.user) {
    await adminClient.auth.admin.deleteUser(bu.user.id);
    throw sue ?? new Error('Failed to create supervisor user');
  }

  const businessUserId = bu.user.id;
  const supervisorUserId = su.user.id;

  await adminClient
    .from('profiles')
    .update({ claimRequestId: claimRequestId, updatedAt: new Date().toISOString() })
    .eq('id', businessUserId);

  await adminClient
    .from('profiles')
    .update({ claimRequestId: claimRequestId, isSupervisor: true, updatedAt: new Date().toISOString() })
    .eq('id', supervisorUserId);

  await adminClient
    .from('claimRequests')
    .update({
      userId: businessUserId,
      supervisorId: supervisorUserId,
      password: randomPassword,
      supervisorPassword,
      trackingNumber,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', claimRequestId);

  await sendClaimVerificationEmails({
    businessEmail,
    supervisorEmail,
    companyName,
    randomPassword,
    supervisorPassword,
    businessUserId,
    supervisorUserId,
  });

  return { success: true, trackingNumber };
}
