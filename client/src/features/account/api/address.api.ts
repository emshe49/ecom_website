import api from '../../../services/api';
import { Address, CreateAddressInput, UpdateAddressInput } from '../types/account.types';

export const addressApi = {
  listAddresses: async (): Promise<Address[]> => {
    const response = await api.get<{ success: boolean; data: { addresses: Address[] } }>('/addresses');
    return response.data.data.addresses;
  },

  getAddress: async (addressId: string): Promise<Address> => {
    const response = await api.get<{ success: boolean; data: { address: Address } }>(`/addresses/${addressId}`);
    return response.data.data.address;
  },

  createAddress: async (data: CreateAddressInput): Promise<Address> => {
    const response = await api.post<{ success: boolean; data: { address: Address } }>('/addresses', data);
    return response.data.data.address;
  },

  updateAddress: async (addressId: string, data: UpdateAddressInput): Promise<Address> => {
    const response = await api.patch<{ success: boolean; data: { address: Address } }>(
      `/addresses/${addressId}`,
      data
    );
    return response.data.data.address;
  },

  deleteAddress: async (addressId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ success: boolean; data: { message: string } }>(
      `/addresses/${addressId}`
    );
    return response.data.data;
  },

  setDefaultShipping: async (addressId: string): Promise<Address> => {
    const response = await api.patch<{ success: boolean; data: { address: Address } }>(
      `/addresses/${addressId}/default-shipping`
    );
    return response.data.data.address;
  },

  setDefaultBilling: async (addressId: string): Promise<Address> => {
    const response = await api.patch<{ success: boolean; data: { address: Address } }>(
      `/addresses/${addressId}/default-billing`
    );
    return response.data.data.address;
  },
};
