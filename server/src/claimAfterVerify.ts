import { adminClient } from './supabase.js';

/** After a user's email is confirmed, sync profile and advance any matching company claim. */
export async function syncProfileAfterEmailVerified(userId: string): Promise<void> {
  const { data: ures } = await adminClient.auth.admin.getUserById(userId);
  const email = ures.user?.email?.toLowerCase().trim();
  if (!email) return;

  await adminClient
    .from('profiles')
    .update({
      isEmailVerified: true,
      status: 'active',
      email,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', userId);

  const { data: bClaims } = await adminClient.from('claimRequests').select('*').eq('businessEmail', email);
  const { data: sClaims } = await adminClient.from('claimRequests').select('*').eq('supervisorEmail', email);
  const byId = new Map<string, Record<string, unknown>>();
  for (const c of bClaims || []) byId.set(c.id as string, c as Record<string, unknown>);
  for (const c of sClaims || []) byId.set(c.id as string, c as Record<string, unknown>);
  const claims = [...byId.values()];
  if (!claims.length) return;

  for (const claim of claims) {
    const c = claim as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const be = typeof c.businessEmail === 'string' ? c.businessEmail.toLowerCase() : '';
    const se = typeof c.supervisorEmail === 'string' ? c.supervisorEmail.toLowerCase() : '';
    if (be === email) {
      patch.businessEmailVerified = true;
    }
    if (se === email) {
      patch.supervisorEmailVerified = true;
    }
    await adminClient.from('claimRequests').update(patch).eq('id', c.id as string);

    const { data: fresh } = await adminClient.from('claimRequests').select('*').eq('id', c.id as string).maybeSingle();
    if (!fresh) continue;

    if (fresh.businessEmailVerified && fresh.supervisorEmailVerified) {
      if (fresh.userId) {
        await adminClient
          .from('profiles')
          .update({
            role: 'company',
            companyId: fresh.companyId,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', fresh.userId);
      }
      if (fresh.supervisorId) {
        await adminClient
          .from('profiles')
          .update({
            role: 'company',
            companyId: fresh.companyId,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', fresh.supervisorId);
      }
      await adminClient
        .from('companies')
        .update({
          claimed: true,
          claimedByName: fresh.requesterName || 'Unknown',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', fresh.companyId);

      await adminClient
        .from('claimRequests')
        .update({ status: 'approved', updatedAt: new Date().toISOString() })
        .eq('id', fresh.id);
    }
  }
}
