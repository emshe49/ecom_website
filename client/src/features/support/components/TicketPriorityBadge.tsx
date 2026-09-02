import React from 'react';
import { TicketPriority } from '../types/support.types';

const priorityConfig: Record<
  TicketPriority,
  { label: string; bg: string; text: string }
> = {
  LOW: {
    label: 'Low',
    bg: 'bg-slate-500/10 border-slate-500/30',
    text: 'text-slate-400',
  },
  NORMAL: {
    label: 'Normal',
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
  },
  HIGH: {
    label: 'High',
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-rose-500/10 border-rose-500/30',
    text: 'text-rose-400 font-semibold',
  },
};

export const TicketPriorityBadge: React.FC<{ priority: TicketPriority; className?: string }> = ({
  priority,
  className = '',
}) => {
  const config = priorityConfig[priority] || {
    label: priority,
    bg: 'bg-slate-800 border-slate-700',
    text: 'text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
};
