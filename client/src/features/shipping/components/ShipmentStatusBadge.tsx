import React from 'react';
import { SHIPMENT_STATUS, ShipmentStatus } from '../types/shipping.types';

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
}

const statusConfig: Record<
  ShipmentStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  [SHIPMENT_STATUS.PENDING]: {
    label: 'Pending Fulfillment',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    dot: 'bg-amber-500',
  },
  [SHIPMENT_STATUS.READY_TO_SHIP]: {
    label: 'Ready To Ship',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    dot: 'bg-blue-500',
  },
  [SHIPMENT_STATUS.SHIPPED]: {
    label: 'Dispatched',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    dot: 'bg-indigo-500',
  },
  [SHIPMENT_STATUS.IN_TRANSIT]: {
    label: 'In Transit',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/60',
    dot: 'bg-cyan-500',
  },
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: {
    label: 'Out For Delivery',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    dot: 'bg-purple-500 animate-pulse',
  },
  [SHIPMENT_STATUS.DELIVERED]: {
    label: 'Delivered',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  [SHIPMENT_STATUS.FAILED]: {
    label: 'Delivery Failed',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    dot: 'bg-rose-500',
  },
  [SHIPMENT_STATUS.CANCELLED]: {
    label: 'Cancelled',
    bg: 'bg-zinc-100 dark:bg-zinc-800/60',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
    dot: 'bg-zinc-400',
  },
};

export const ShipmentStatusBadge: React.FC<ShipmentStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const config = statusConfig[status] || statusConfig[SHIPMENT_STATUS.PENDING];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
