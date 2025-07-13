export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  iconUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  categoryId: string;
  location: string;
  logoUrl?: string;
  description?: string;
  phone?: string;
  website?: string;
  claimed: boolean; // Track if company is claimed by a user
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimRequest {
  id: string;
  companyId: string;
  companyName: string;
  trackingNumber?: string;
  requesterId?: string; // User ID if logged in
  requesterName?: string; // User name if logged in
  contactPhone: string;
  businessEmail: string;
  supervisorEmail: string;
  password?: string; // Password entered by the user during claim process
  status: 'pending' | 'approved' | 'rejected';
  domainVerified?: boolean;
  notes?: string; // Admin notes about the request
  createdAt: Date;
  updatedAt: Date;
}

export const egyptianGovernorates = [
  { id: 'cairo', name: 'Cairo', nameAr: 'القاهرة' },
  { id: 'giza', name: 'Giza', nameAr: 'الجيزة' },
  { id: 'alexandria', name: 'Alexandria', nameAr: 'الإسكندرية' },
  { id: 'qalyubia', name: 'Qalyubia', nameAr: 'القليوبية' },
  { id: 'port-said', name: 'Port Said', nameAr: 'بورسعيد' },
  { id: 'suez', name: 'Suez', nameAr: 'السويس' },
  { id: 'luxor', name: 'Luxor', nameAr: 'الأقصر' },
  { id: 'aswan', name: 'Aswan', nameAr: 'أسوان' },
  { id: 'red-sea', name: 'Red Sea', nameAr: 'البحر الأحمر' },
  { id: 'dakahlia', name: 'Dakahlia', nameAr: 'الدقهلية' }
];