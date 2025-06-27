export interface CompanyProfile {
  id: string;
  name: string;
  email: string;
  categoryId: string;
  location: string;
  description: string;
  descriptionAr?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  verified: boolean;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  businessHours?: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  totalRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}