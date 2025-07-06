export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  relatedId?: string; // ID of related item (review, reply, etc.)
  link?: string; // Optional link to navigate to
}

export type NotificationType = 
  // User notifications
  | 'company-reply' // When a company replies to user's review
  | 'admin-edit-review' // When admin edits user's review
  | 'admin-delete-review' // When admin deletes user's review
  | 'review-votes' // When review gets 5+ votes
  
  // Company notifications
  | 'new-review' // When a user writes a new review for the company
  | 'admin-delete-reply' // When admin deletes company's reply
  | 'reply-votes' // When reply gets 5+ votes
  
  // Admin notifications
  | 'new-report' // When a new report is submitted
  | 'new-claim-request'; // When a new claim request is submitted