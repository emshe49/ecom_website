import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { TicketStatus } from '../types/support.types';

export const CustomerReplyForm: React.FC<{
  ticketStatus: TicketStatus;
  canReopen: boolean;
  onSendReply: (message: string) => Promise<void>;
  onReopen: () => Promise<void>;
}> = ({ ticketStatus, canReopen, onSendReply, onReopen }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ticketStatus === 'CLOSED') {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-slate-400 text-sm">
        This ticket is closed and can no longer receive replies. If you need help with another issue, please submit a new support request.
      </div>
    );
  }

  if (ticketStatus === 'RESOLVED') {
    return (
      <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 text-center space-y-3">
        <p className="text-sm text-teal-300">
          This ticket has been marked as resolved. If your issue is not fully resolved, you can reopen it.
        </p>
        {canReopen ? (
          <button
            type="button"
            onClick={async () => {
              try {
                setIsSubmitting(true);
                await onReopen();
              } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to reopen ticket');
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Reopening...' : 'Reopen Ticket'}
          </button>
        ) : (
          <p className="text-xs text-slate-400">
            The 7-day reopen window has expired. Please submit a new ticket if you still require assistance.
          </p>
        )}
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSendReply(message.trim());
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/20 bg-rose-950/20 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          rows={4}
          maxLength={5000}
          className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y"
        />
        <div className="text-right text-xs text-slate-500 mt-1">
          {message.length} / 5000
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!message.trim() || isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
        </button>
      </div>
    </form>
  );
};
