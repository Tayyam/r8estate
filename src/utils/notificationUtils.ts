import { collection, addDoc, query, where, getDocs, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification } from '../types/notification';

// Create a notification
export const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const notificationData = {
      ...notification,
      createdAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create a notification for a user when a company replies to their review
export const notifyUserOfCompanyReply = async (
  userId: string,
  companyName: string,
  reviewId: string,
  companyId: string
): Promise<void> => {
  try {
    // Create link to the specific review
    const companyDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', companyId)));
    if (companyDoc.empty) return;
    
    const company = companyDoc.docs[0].data();
    const companySlug = company.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      title: 'Company Replied to Your Review',
      message: `${companyName} has replied to your review`,
      type: 'company-reply',
      isRead: false,
      relatedId: reviewId,
      link: `/company/${companySlug}/${companyId}/reviews?review=${reviewId}`
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error('Error notifying user of company reply:', error);
  }
};

// Create a notification for a company when a new review is posted
export const notifyCompanyOfNewReview = async (
  companyId: string,
  userName: string,
  reviewId: string
): Promise<void> => {
  try {
    // Find the company owner's user ID
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'company'),
      where('companyId', '==', companyId)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    if (usersSnapshot.empty) return;
    
    const companyUser = usersSnapshot.docs[0];
    const userId = companyUser.id;
    
    // Create a notification for the company owner
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      title: 'New Review',
      message: `${userName} posted a new review for your company`,
      type: 'new-review',
      isRead: false,
      relatedId: reviewId,
      link: `/company/${companyId}/reviews?review=${reviewId}`
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error('Error notifying company of new review:', error);
  }
};

// Create a notification for admins when a new report is submitted
export const notifyAdminsOfNewReport = async (
  reportId: string,
  contentType: 'review' | 'reply'
): Promise<void> => {
  try {
    // Find all admin users
    const adminsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin')
    );
    
    const adminsSnapshot = await getDocs(adminsQuery);
    if (adminsSnapshot.empty) return;
    
    // Create a notification for each admin
    const notifications = adminsSnapshot.docs.map(adminDoc => {
      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        userId: adminDoc.id,
        title: 'New Report Submitted',
        message: `A new report for a ${contentType} requires your attention`,
        type: 'new-report',
        isRead: false,
        relatedId: reportId,
        link: '/admin/settings?tab=reports'
      };
      
      return notification;
    });
    
    // Create all notifications
    await Promise.all(notifications.map(notification => createNotification(notification)));
  } catch (error) {
    console.error('Error notifying admins of new report:', error);
  }
};

// Create a notification for admins when a new claim request is submitted
export const notifyAdminsOfNewClaimRequest = async (
  claimRequestId: string,
  companyName: string
): Promise<void> => {
  try {
    // Find all admin users
    const adminsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin')
    );
    
    const adminsSnapshot = await getDocs(adminsQuery);
    if (adminsSnapshot.empty) return;
    
    // Create a notification for each admin
    const notifications = adminsSnapshot.docs.map(adminDoc => {
      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        userId: adminDoc.id,
        title: 'New Company Claim Request',
        message: `A new claim request for "${companyName}" requires your attention`,
        type: 'new-claim-request',
        isRead: false,
        relatedId: claimRequestId,
        link: '/admin/settings?tab=claims'
      };
      
      return notification;
    });
    
    // Create all notifications
    await Promise.all(notifications.map(notification => createNotification(notification)));
  } catch (error) {
    console.error('Error notifying admins of new claim request:', error);
  }
};

// Notify a user when admin edits their review
export const notifyUserOfReviewEdit = async (
  userId: string,
  reviewId: string,
  companyId: string
): Promise<void> => {
  try {
    const companyDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', companyId)));
    if (companyDoc.empty) return;
    
    const company = companyDoc.docs[0].data();
    const companySlug = company.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      title: 'Your Review Was Edited',
      message: 'An administrator has edited your review due to policy violations',
      type: 'admin-edit-review',
      isRead: false,
      relatedId: reviewId,
      link: `/company/${companySlug}/${companyId}/reviews?review=${reviewId}`
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error('Error notifying user of review edit:', error);
  }
};

// Notify a user when admin deletes their review
export const notifyUserOfReviewDeletion = async (
  userId: string,
  companyName: string
): Promise<void> => {
  try {
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      title: 'Your Review Was Deleted',
      message: `Your review for ${companyName} was deleted by an administrator due to policy violations`,
      type: 'admin-delete-review',
      isRead: false
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error('Error notifying user of review deletion:', error);
  }
};

// Notify a company when admin deletes their reply
export const notifyCompanyOfReplyDeletion = async (
  companyId: string,
  reviewTitle: string
): Promise<void> => {
  try {
    // Find the company owner's user ID
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'company'),
      where('companyId', '==', companyId)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    if (usersSnapshot.empty) return;
    
    const companyUser = usersSnapshot.docs[0];
    const userId = companyUser.id;
    
    // Create a notification for the company owner
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      title: 'Your Reply Was Deleted',
      message: `Your reply to the review "${reviewTitle}" was deleted by an administrator due to policy violations`,
      type: 'admin-delete-reply',
      isRead: false
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error('Error notifying company of reply deletion:', error);
  }
};