export interface Project {
  id: string;
  companyId: string;
  name: string;
  about: string;
  area: number; // in square meters
  location: string;
  startDate: Date | null;
  deliveryDate: Date | null;
  deliveryDateUpdated: Date | null;
  brochureUrl?: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  units: Unit[];
}

export interface Unit {
  id: string;
  projectId: string;
  name: string;
  type: UnitType;
  area: number; // in square meters
  price?: number;
  status: UnitStatus;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum UnitType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  STUDIO = 'studio',
  DUPLEX = 'duplex',
  PENTHOUSE = 'penthouse',
  OFFICE = 'office',
  RETAIL = 'retail',
  OTHER = 'other'
}

export enum UnitStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RESERVED = 'reserved'
}

export const UnitTypeLabels: Record<UnitType, string> = {
  [UnitType.APARTMENT]: 'Apartment',
  [UnitType.VILLA]: 'Villa',
  [UnitType.STUDIO]: 'Studio',
  [UnitType.DUPLEX]: 'Duplex',
  [UnitType.PENTHOUSE]: 'Penthouse',
  [UnitType.OFFICE]: 'Office',
  [UnitType.RETAIL]: 'Retail',
  [UnitType.OTHER]: 'Other'
};

export const UnitStatusLabels: Record<UnitStatus, string> = {
  [UnitStatus.AVAILABLE]: 'Available',
  [UnitStatus.SOLD]: 'Sold',
  [UnitStatus.RESERVED]: 'Reserved'
};

export const UnitStatusColors: Record<UnitStatus, string> = {
  [UnitStatus.AVAILABLE]: 'text-green-600 bg-green-100',
  [UnitStatus.SOLD]: 'text-red-600 bg-red-100',
  [UnitStatus.RESERVED]: 'text-amber-600 bg-amber-100'
};