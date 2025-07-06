export interface Report {
  id: string;
  contentId: string;
  contentType: 'review' | 'reply';
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reason: 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'other';
  details?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
}