import React from 'react';
import { SupportMessageItem } from '../types/support.types';
import { Lock, User, Shield } from 'lucide-react';

export const TicketMessageItem: React.FC<{
  message: SupportMessageItem;
  isStaffViewer?: boolean;
}> = ({ message, isStaffViewer = false }) => {
  const isInternalNote = message.messageType === 'INTERNAL_NOTE';
  const isStaffSender = message.senderType === 'STAFF';

  // Format date nicely
  const formattedTime = new Date(message.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isInternalNote) {
    return (
      <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 text-slate-200 space-y-2 my-3">
        <div className="flex items-center justify-between text-xs text-amber-400 font-semibold border-b border-amber-500/20 pb-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Internal Staff Note (Invisible to Customer)</span>
            <span className="text-slate-400 font-normal ml-2">by {message.senderName}</span>
          </div>
          <span className="text-slate-400 font-normal">{formattedTime}</span>
        </div>
        <div className="whitespace-pre-wrap text-sm text-amber-100/90 font-sans leading-relaxed">
          {message.body}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col space-y-1.5 p-4 rounded-xl border my-3 transition-colors ${
        isStaffSender
          ? 'bg-indigo-950/20 border-indigo-500/30 text-slate-100'
          : 'bg-slate-900/60 border-slate-800 text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          {isStaffSender ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
              <Shield className="w-3 h-3" />
              {isStaffViewer ? message.senderName : 'Support Agent'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              <User className="w-3 h-3" />
              {message.senderName || 'Customer'}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-xs">{formattedTime}</span>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed pt-1">
        {message.body}
      </div>
    </div>
  );
};
