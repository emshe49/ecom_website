import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi } from '../api/address.api';
import { Address } from '../types/account.types';
import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';
import { DeleteAddressModal } from './DeleteAddressModal';
import { Plus, MapPin, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';

export const SavedAddressesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: addresses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressApi.listAddresses,
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) => addressApi.deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setDeletingAddress(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setActionError(err.response.data.error.message);
      } else {
        setActionError('Failed to delete address.');
      }
    },
  });

  const setDefaultShippingMutation = useMutation({
    mutationFn: (addressId: string) => addressApi.setDefaultShipping(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setActionError(err.response.data.error.message);
      }
    },
  });

  const setDefaultBillingMutation = useMutation({
    mutationFn: (addressId: string) => addressApi.setDefaultBilling(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setActionError(err.response.data.error.message);
      }
    },
  });

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (address: Address) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-semibold text-white">Saved Addresses</h2>
          <p className="text-xs text-slate-400">
            Manage your delivery and billing addresses for checkout
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Address</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-start gap-2.5 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading saved addresses...</p>
        </div>
      ) : isError ? (
        <div className="py-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">Failed to load addresses.</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No addresses saved yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your shipping and billing addresses to enjoy faster and smoother checkout.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Address</span>
          </button>
        </div>
      ) : (
        /* Addresses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleOpenEdit}
              onDelete={(addr) => setDeletingAddress(addr)}
              onSetDefaultShipping={(id) => setDefaultShippingMutation.mutate(id)}
              onSetDefaultBilling={(id) => setDefaultBillingMutation.mutate(id)}
              isUpdatingShipping={setDefaultShippingMutation.isPending}
              isUpdatingBilling={setDefaultBillingMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <AddressForm
          addressToEdit={editingAddress}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAddress(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteAddressModal
        address={deletingAddress}
        isOpen={!!deletingAddress}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeletingAddress(null)}
        onConfirm={() => deletingAddress && deleteMutation.mutate(deletingAddress.id)}
      />
    </div>
  );
};
