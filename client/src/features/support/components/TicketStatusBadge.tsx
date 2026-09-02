import React from 'react';
import { TicketStatus } from '../types/support.types';

const statusConfig: Record<
  TicketStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  OPEN: {
    label: 'Open',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  WAITING_FOR_CUSTOMER: {
    label: 'Waiting on Customer',
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  WAITING_FOR_SUPPORT: {
    label: 'Waiting on Support',
    bg: 'bg-purple-500/10 border-purple-500/30',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-teal-500/10 border-teal-500/30',
    text: 'text-teal-400',
    dot: 'bg-teal-400',
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-slate-500/10 border-slate-500/30',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
};

export const TicketStatusBadge: React.FC<{ status: TicketStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const config = statusConfig[status] || {
    label: status,
    bg: 'bg-slate-800 border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
