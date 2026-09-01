import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';
import { addressApi } from '../../account/api/address.api';
import { Address, CreateAddressInput } from '../../account/types/account.types';

interface ApiErrorData {
  error?: {
    message?: string;
  };
}


interface CheckoutAddressSelectorProps {
  selectedShippingId: string | null;
  onSelectShipping: (id: string) => void;
  billingSameAsShipping: boolean;
  onToggleBillingSame: (same: boolean) => void;
  selectedBillingId: string | null;
  onSelectBilling: (id: string) => void;
}

export const CheckoutAddressSelector: React.FC<CheckoutAddressSelectorProps> = ({
  selectedShippingId,
  onSelectShipping,
  billingSameAsShipping,
  onToggleBillingSame,
  selectedBillingId,
  onSelectBilling,
}) => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddressError, setNewAddressError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAddressInput>({
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
  });

  const {
    data: addresses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressApi.listAddresses,
  });

  // Auto-select defaults if available and not yet selected
  React.useEffect(() => {
    if (addresses.length > 0) {
      if (!selectedShippingId) {
        const defaultShip = addresses.find((a) => a.isDefaultShipping) || addresses[0];
        onSelectShipping(defaultShip.id);
      }
      if (!selectedBillingId) {
        const defaultBill = addresses.find((a) => a.isDefaultBilling) || addresses[0];
        onSelectBilling(defaultBill.id);
      }
    }
  }, [addresses, selectedShippingId, selectedBillingId, onSelectShipping, onSelectBilling]);

  const addAddressMutation = useMutation({
    mutationFn: addressApi.createAddress,
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      onSelectShipping(newAddress.id);
      if (billingSameAsShipping) {
        onSelectBilling(newAddress.id);
      }
      setShowAddModal(false);
      setFormData({
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
      });
      setNewAddressError(null);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setNewAddressError(
        axiosError?.response?.data?.error?.message || 'Failed to save new address.'
      );
    },
  });


  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.addressLine1 || !formData.city || !formData.stateProvince) {
      setNewAddressError('Please fill in all required address fields.');
      return;
    }
    addAddressMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Loading delivery addresses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm flex items-center gap-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
        <span>Failed to load saved addresses. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Shipping Address Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <span>Select Shipping Address</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
            <p className="text-sm text-slate-400">No saved addresses found.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Address</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {addresses.map((addr: Address) => {
              const isSelected = selectedShippingId === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => onSelectShipping(addr.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm flex items-center gap-2">
                        {addr.fullName}
                        {addr.isDefaultShipping && (
                          <span className="text-[10px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                            Default Shipping
                          </span>
                        )}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {addr.addressLine1}
                      {addr.addressLine2 && `, ${addr.addressLine2}`}
                      {addr.city && `, ${addr.city}`}
                      {addr.stateProvince && `, ${addr.stateProvince}`}
                    </p>
                    <p className="text-xs font-mono text-slate-500">{addr.phone}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Billing Address Options */}
      <div className="pt-4 border-t border-slate-800/80 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billingSameAsShipping}
            onChange={(e) => onToggleBillingSame(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
          />
          <span className="text-sm font-medium text-slate-200">
            Billing address is the same as shipping address
          </span>
        </label>

        {!billingSameAsShipping && (
          <div className="space-y-3 pl-7 animate-fadeIn">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Distinct Billing Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {addresses.map((addr: Address) => {
                const isSelected = selectedBillingId === addr.id;
                return (
                  <div
                    key={addr.id}
                    onClick={() => onSelectBilling(addr.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-950/40'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs">{addr.fullName}</span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed truncate">
                        {addr.addressLine1}, {addr.city}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add New Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Add Delivery Address</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {newAddressError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{newAddressError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAddress} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. +923001234567"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Street address, house #, building"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Lahore"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">State / Province *</label>
                  <input
                    type="text"
                    required
                    value={formData.stateProvince}
                    onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Punjab"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAddressMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {addAddressMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
