export type UserRole = 'user' | 'company' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  companyId?: string; // Only for company users
  isEmailVerified: boolean;
  photoURL?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  phone: string;
  website?: string;
  logo?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}