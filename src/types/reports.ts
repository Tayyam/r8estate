export type ReportReason = 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'other';
export type ReportStatus = 'pending' | 'accepted' | 'denied';

export interface Report {
  id: string;
  reporterId: string; // User who reported
  reporterName: string; // Name of the user who reported
  contentType: 'review' | 'reply'; // Type of content reported
  contentId: string; // ID of the review or reply
  companyId: string; // ID of the company for the review/reply
  reason: ReportReason;
  details?: string; // Optional additional details
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}