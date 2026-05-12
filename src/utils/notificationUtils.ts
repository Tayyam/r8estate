import { supabase } from '../config/supabase';
import { Notification } from '../types/notification';

export const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<string> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      relatedId: notification.relatedId ?? null,
      link: notification.link ?? null,
      createdAt: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
};

export const notifyUserOfCompanyReply = async (
  userId: string,
  companyName: string,
  reviewId: string,
  companyId: string
): Promise<void> => {
  try {
    const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).maybeSingle();
    if (!company?.name) return;
    const companySlug = company.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    await createNotification({
      userId,
      title: 'Company Replied to Your Review',
      message: `${companyName} has replied to your review`,
      type: 'company-reply',
      isRead: false,
      relatedId: reviewId,
      link: `/company/${companySlug}/${companyId}/reviews?review=${reviewId}`,
    });
  } catch (error) {
    console.error('Error notifying user of company reply:', error);
  }
};

export const notifyCompanyOfNewReview = async (
  companyId: string,
  userName: string,
  reviewId: string
): Promise<void> => {
  try {
    const { data: row } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'company')
      .eq('companyId', companyId)
      .limit(1)
      .maybeSingle();
    if (!row?.id) return;
    await createNotification({
      userId: row.id,
      title: 'New Review',
      message: `${userName} posted a new review for your company`,
      type: 'new-review',
      isRead: false,
      relatedId: reviewId,
      link: `/company/${companyId}/reviews?review=${reviewId}`,
    });
  } catch (error) {
    console.error('Error notifying company of new review:', error);
  }
};

export const notifyAdminsOfNewReport = async (
  reportId: string,
  contentType: 'review' | 'reply'
): Promise<void> => {
  try {
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (!admins?.length) return;
    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.id,
          title: 'New Report Submitted',
          message: `A new report for a ${contentType} requires your attention`,
          type: 'new-report',
          isRead: false,
          relatedId: reportId,
          link: '/admin/settings?tab=reports',
        })
      )
    );
  } catch (error) {
    console.error('Error notifying admins of new report:', error);
  }
};

export const notifyAdminsOfNewClaimRequest = async (
  claimRequestId: string,
  companyName: string
): Promise<void> => {
  try {
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (!admins?.length) return;
    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.id,
          title: 'New Company Claim Request',
          message: `A new claim request for "${companyName}" requires your attention`,
          type: 'new-claim-request',
          isRead: false,
          relatedId: claimRequestId,
          link: '/admin/settings?tab=claims',
        })
      )
    );
  } catch (error) {
    console.error('Error notifying admins of new claim request:', error);
  }
};

export const notifyUserOfReviewEdit = async (
  userId: string,
  reviewId: string,
  companyId: string
): Promise<void> => {
  try {
    const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).maybeSingle();
    if (!company?.name) return;
    const companySlug = company.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    await createNotification({
      userId,
      title: 'Your Review Was Edited',
      message: 'An administrator has edited your review due to policy violations',
      type: 'admin-edit-review',
      isRead: false,
      relatedId: reviewId,
      link: `/company/${companySlug}/${companyId}/reviews?review=${reviewId}`,
    });
  } catch (error) {
    console.error('Error notifying user of review edit:', error);
  }
};

export const notifyUserOfReviewDeletion = async (userId: string, companyName: string): Promise<void> => {
  try {
    await createNotification({
      userId,
      title: 'Your Review Was Deleted',
      message: `Your review for ${companyName} was deleted by an administrator due to policy violations`,
      type: 'admin-delete-review',
      isRead: false,
    });
  } catch (error) {
    console.error('Error notifying user of review deletion:', error);
  }
};

export const notifyCompanyOfReplyDeletion = async (companyId: string, reviewTitle: string): Promise<void> => {
  try {
    const { data: row } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'company')
      .eq('companyId', companyId)
      .limit(1)
      .maybeSingle();
    if (!row?.id) return;
    await createNotification({
      userId: row.id,
      title: 'Your Reply Was Deleted',
      message: `Your reply to the review "${reviewTitle}" was deleted by an administrator due to policy violations`,
      type: 'admin-delete-reply',
      isRead: false,
    });
  } catch (error) {
    console.error('Error notifying company of reply deletion:', error);
  }
};
