import React, { useState } from 'react';
import { Send, Lock, MessageSquare, AlertCircle } from 'lucide-react';

export const StaffReplyForm: React.FC<{
  onSendReply: (message: string) => Promise<void>;
  onAddInternalNote: (message: string) => Promise<void>;
}> = ({ onSendReply, onAddInternalNote }) => {
  const [mode, setMode] = useState<'REPLY' | 'NOTE'>('REPLY');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      if (mode === 'REPLY') {
        await onSendReply(message.trim());
      } else {
        await onAddInternalNote(message.trim());
      }
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setMode('REPLY');
            setError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'REPLY'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Reply to Customer</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('NOTE');
            setError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'NOTE'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Internal Note (Staff Only)</span>
        </button>
      </div>

      {mode === 'NOTE' && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-950/20 text-xs text-amber-300">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>This note is private to internal staff and will NEVER be visible to the customer.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/20 bg-rose-950/20 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              mode === 'REPLY'
                ? 'Type your message to the customer...'
                : 'Write an internal note for staff members...'
            }
            rows={4}
            maxLength={5000}
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all resize-y ${
              mode === 'REPLY'
                ? 'bg-slate-900/60 border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500'
                : 'bg-amber-950/10 border-amber-500/30 text-amber-100 placeholder-amber-500/60 focus:ring-2 focus:ring-amber-500'
            }`}
          />
          <div className="text-right text-xs text-slate-500 mt-0.5">
            {message.length} / 5000
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'REPLY'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20'
            }`}
          >
            {mode === 'REPLY' ? <Send className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>
              {isSubmitting
                ? 'Posting...'
                : mode === 'REPLY'
                ? 'Send to Customer'
                : 'Save Internal Note'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
