import { User } from '../../auth/types/auth.types';

export interface Address {
  id: string;
  userId: string;
  label?: string | null;
  fullName: string;
  phone: string;
  country: string;
  stateProvince: string;
  city: string;
  area?: string | null;
  postalCode?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label?: string | null;
  fullName: string;
  phone: string;
  country: string;
  stateProvince: string;
  city: string;
  area?: string | null;
  postalCode?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface UpdateAddressInput {
  label?: string | null;
  fullName?: string;
  phone?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  area?: string | null;
  postalCode?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export type { User };
