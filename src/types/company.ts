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
  verified: boolean;
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