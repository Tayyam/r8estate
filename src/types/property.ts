export interface Property {
  id: string;
  companyId: string;
  name: string;
  description: string;
  descriptionAr?: string;
  area: number; // in square meters
  location: string;
  locationAr?: string;
  projectName: string;
  projectNameAr?: string;
  images: string[];
  price?: number;
  propertyType: 'apartment' | 'villa' | 'commercial' | 'land' | 'office';
  status: 'available' | 'sold' | 'reserved';
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1-5
  title: string;
  content: string;
  companyReply?: {
    content: string;
    repliedAt: Date;
    repliedBy: string;
    replierName: string;
  };
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}