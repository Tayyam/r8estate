// Project and Unit Review Types
export interface ProjectReview {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1-5
  title: string;
  content: string;
  isAnonymous?: boolean;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  companyReply?: {
    content: string;
    repliedAt: Date;
    repliedBy: string;
    replierName: string;
  };
}

export interface UnitReview {
  id: string;
  projectId: string;
  unitId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1-5
  title: string;
  content: string;
  isAnonymous?: boolean;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  companyReply?: {
    content: string;
    repliedAt: Date;
    repliedBy: string;
    replierName: string;
  };
}