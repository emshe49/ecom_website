import React from 'react';
import { TicketCategory } from '../types/support.types';

export const TicketCategoryBadge: React.FC<{ category: TicketCategory; className?: string }> = ({
  category,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
    >
      {category}
    </span>
  );
};
