import React from 'react';
import { AuditCategory } from '../types/audit.types';

interface AuditEventBadgeProps {
  category: AuditCategory;
  eventType: string;
}

const CATEGORY_COLORS: Record<AuditCategory, { bg: string; text: string; border: string }> = {
  AUTH: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  USER: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  RBAC: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
  CATALOG: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  INVENTORY: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  ORDER: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  PAYMENT: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  REFUND: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  SHIPPING: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  PROMOTION: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  REVIEW: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  SUPPORT: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  SECURITY: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  SYSTEM: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export const AuditEventBadge: React.FC<AuditEventBadgeProps> = ({ category, eventType }) => {
  const styles = CATEGORY_COLORS[category] || {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${styles.bg} ${styles.text} ${styles.border}`}
      >
        {category}
      </span>
      <span className="text-xs font-mono font-medium text-slate-300">{eventType}</span>
    </div>
  );
};
