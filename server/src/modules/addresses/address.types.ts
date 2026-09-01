import { AddressResponseDTO } from './address.model.js';

export interface CreateAddressDTO {
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

export interface UpdateAddressDTO {
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

export interface AddressListResponse {
  addresses: AddressResponseDTO[];
}

export interface SingleAddressResponse {
  address: AddressResponseDTO;
}
