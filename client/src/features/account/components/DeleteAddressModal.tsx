import React from 'react';
import { Address } from '../types/account.types';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteAddressModalProps {
  address: Address | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteAddressModal: React.FC<DeleteAddressModalProps> = ({
  address,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !address) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Delete Address</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Are you sure you want to delete this address?
        </p>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-white">{address.fullName}</p>
          <p>{address.addressLine1}</p>
          <p>
            {address.city}, {address.stateProvince} {address.country}
          </p>
        </div>

        {(address.isDefaultShipping || address.isDefaultBilling) && (
          <p className="text-[11px] text-amber-400">
            Note: This is your default {address.isDefaultShipping && 'shipping'}{' '}
            {address.isDefaultShipping && address.isDefaultBilling && '& '}{' '}
            {address.isDefaultBilling && 'billing'} address. A replacement default will be
            automatically assigned from your remaining saved addresses.
          </p>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Address'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
