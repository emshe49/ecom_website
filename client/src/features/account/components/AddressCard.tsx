import React from 'react';
import { Address } from '../types/account.types';
import { MapPin, Phone, Edit2, Trash2, Check, ShieldCheck, Tag } from 'lucide-react';

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefaultShipping: (addressId: string) => void;
  onSetDefaultBilling: (addressId: string) => void;
  isUpdatingShipping: boolean;
  isUpdatingBilling: boolean;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefaultShipping,
  onSetDefaultBilling,
  isUpdatingShipping,
  isUpdatingBilling,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header: Label & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {address.label && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[11px] font-semibold">
                <Tag className="w-3 h-3" />
                {address.label}
              </span>
            )}
            <span className="text-sm font-semibold text-white">{address.fullName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {address.isDefaultShipping && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-medium">
                <Check className="w-3 h-3" />
                Default Shipping
              </span>
            )}
            {address.isDefaultBilling && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-[10px] font-medium">
                <ShieldCheck className="w-3 h-3" />
                Default Billing
              </span>
            )}
          </div>
        </div>

        {/* Address Details */}
        <div className="space-y-1 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p>{address.addressLine1}</p>
              {address.addressLine2 && <p className="text-slate-400">{address.addressLine2}</p>}
              <p>
                {address.city}
                {address.area ? `, ${address.area}` : ''}, {address.stateProvince}{' '}
                {address.postalCode || ''}
              </p>
              <p className="font-semibold text-slate-400">{address.country}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-slate-400">
            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{address.phone}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {!address.isDefaultShipping && (
            <button
              onClick={() => onSetDefaultShipping(address.id)}
              disabled={isUpdatingShipping}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors cursor-pointer font-medium"
            >
              {isUpdatingShipping ? 'Setting...' : 'Set as Default Shipping'}
            </button>
          )}
          {!address.isDefaultShipping && !address.isDefaultBilling && (
            <span className="text-slate-700">|</span>
          )}
          {!address.isDefaultBilling && (
            <button
              onClick={() => onSetDefaultBilling(address.id)}
              disabled={isUpdatingBilling}
              className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors cursor-pointer font-medium"
            >
              {isUpdatingBilling ? 'Setting...' : 'Set as Default Billing'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onEdit(address)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Edit Address"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(address)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
            title="Delete Address"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
