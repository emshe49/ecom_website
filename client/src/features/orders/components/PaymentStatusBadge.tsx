import React from 'react';
import { PaymentStatus } from '../orders.types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const config: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  UNPAID: {
    label: 'Unpaid (COD / Pending)',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  AUTHORIZED: {
    label: 'Authorized',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  PAID: {
    label: 'Paid',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  REFUNDED: {
    label: 'Refunded',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
  PARTIALLY_REFUNDED: {
    label: 'Partially Refunded',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
  FAILED: {
    label: 'Payment Failed',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
  },
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const current = config[status] || {
    label: status,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  );
};
