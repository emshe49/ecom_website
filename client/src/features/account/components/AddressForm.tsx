import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressFormSchema, AddressFormValues } from '../schemas/account.schemas';
import { addressApi } from '../api/address.api';
import { Address } from '../types/account.types';
import { X, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';

interface AddressFormProps {
  addressToEdit?: Address | null;
  onClose: () => void;
}

export const AddressForm: React.FC<AddressFormProps> = ({ addressToEdit, onClose }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: addressToEdit
      ? {
          label: addressToEdit.label || '',
          fullName: addressToEdit.fullName,
          phone: addressToEdit.phone,
          country: addressToEdit.country,
          stateProvince: addressToEdit.stateProvince,
          city: addressToEdit.city,
          area: addressToEdit.area || '',
          postalCode: addressToEdit.postalCode || '',
          addressLine1: addressToEdit.addressLine1,
          addressLine2: addressToEdit.addressLine2 || '',
          isDefaultShipping: addressToEdit.isDefaultShipping,
          isDefaultBilling: addressToEdit.isDefaultBilling,
        }
      : {
          label: '',
          fullName: '',
          phone: '',
          country: 'PK',
          stateProvince: '',
          city: '',
          area: '',
          postalCode: '',
          addressLine1: '',
          addressLine2: '',
          isDefaultShipping: false,
          isDefaultBilling: false,
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddressFormValues) => {
      const payload = {
        label: data.label ? data.label.trim() : null,
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        country: data.country.trim().toUpperCase(),
        stateProvince: data.stateProvince.trim(),
        city: data.city.trim(),
        area: data.area ? data.area.trim() : null,
        postalCode: data.postalCode ? data.postalCode.trim() : null,
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2 ? data.addressLine2.trim() : null,
        isDefaultShipping: data.isDefaultShipping,
        isDefaultBilling: data.isDefaultBilling,
      };

      if (addressToEdit) {
        return addressApi.updateAddress(addressToEdit.id, payload);
      } else {
        return addressApi.createAddress(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      onClose();
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setErrorMessage(err.response.data.error.message);
      } else {
        setErrorMessage('Failed to save address. Please verify your details.');
      }
    },
  });

  const onSubmit = (data: AddressFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-base font-bold text-white">
            {addressToEdit ? 'Edit Address' : 'Add New Address'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Label & Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="label">
                Label (e.g. Home)
              </label>
              <input
                id="label"
                type="text"
                placeholder="Home"
                {...register('label')}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
              />
              {errors.label && <p className="text-[11px] text-rose-400">{errors.label.message}</p>}
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="fullName">
                Recipient Full Name *
              </label>
              <input
                id="fullName"
                type="text"
                {...register('fullName')}
                className={`w-full px-3 py-1.5 bg-slate-950 border ${
                  errors.fullName ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-xs text-white focus:outline-none`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-rose-400">{errors.fullName.message}</p>
              )}
            </div>
          </div>

          {/* Phone & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="phone">
                Phone Number *
              </label>
              <input
                id="phone"
                type="text"
                placeholder="+923001234567"
                {...register('phone')}
                className={`w-full px-3 py-1.5 bg-slate-950 border ${
                  errors.phone ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-xs text-white focus:outline-none`}
              />
              {errors.phone && <p className="text-[11px] text-rose-400">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="country">
                Country (ISO Code) *
              </label>
              <input
                id="country"
                type="text"
                placeholder="PK"
                {...register('country')}
                className={`w-full px-3 py-1.5 bg-slate-950 border ${
                  errors.country ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-xs text-white uppercase focus:outline-none`}
              />
              {errors.country && (
                <p className="text-[11px] text-rose-400">{errors.country.message}</p>
              )}
            </div>
          </div>

          {/* State & City & Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="stateProvince">
                State / Province *
              </label>
              <input
                id="stateProvince"
                type="text"
                {...register('stateProvince')}
                className={`w-full px-3 py-1.5 bg-slate-950 border ${
                  errors.stateProvince
                    ? 'border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-xs text-white focus:outline-none`}
              />
              {errors.stateProvince && (
                <p className="text-[11px] text-rose-400">{errors.stateProvince.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="city">
                City *
              </label>
              <input
                id="city"
                type="text"
                {...register('city')}
                className={`w-full px-3 py-1.5 bg-slate-950 border ${
                  errors.city ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-xs text-white focus:outline-none`}
              />
              {errors.city && <p className="text-[11px] text-rose-400">{errors.city.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300" htmlFor="postalCode">
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                {...register('postalCode')}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300" htmlFor="addressLine1">
              Address Line 1 (Street, House No) *
            </label>
            <input
              id="addressLine1"
              type="text"
              {...register('addressLine1')}
              className={`w-full px-3 py-1.5 bg-slate-950 border ${
                errors.addressLine1 ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
              } rounded-lg text-xs text-white focus:outline-none`}
            />
            {errors.addressLine1 && (
              <p className="text-[11px] text-rose-400">{errors.addressLine1.message}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300" htmlFor="addressLine2">
              Address Line 2 (Apartment, Suite, Unit)
            </label>
            <input
              id="addressLine2"
              type="text"
              {...register('addressLine2')}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none"
            />
          </div>

          {/* Default Flags */}
          <div className="pt-2 space-y-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                {...register('isDefaultShipping')}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Set as Default Shipping Address</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                {...register('isDefaultBilling')}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Set as Default Billing Address</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {mutation.isPending ? 'Saving...' : addressToEdit ? 'Update Address' : 'Create Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
