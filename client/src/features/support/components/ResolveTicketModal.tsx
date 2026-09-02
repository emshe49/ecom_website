import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export const ResolveTicketModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolutionSummary: string) => Promise<void>;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || summary.trim().length < 5) {
      setError('Resolution summary must be at least 5 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(summary.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to resolve ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-teal-400 font-semibold">
            <CheckCircle className="w-5 h-5" />
            <h3>Resolve Support Ticket</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/20 bg-rose-950/20 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Resolution Summary <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Explain how this support issue was resolved for the customer..."
              rows={4}
              maxLength={2000}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-y"
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {summary.length} / 2000
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={summary.trim().length < 5 || isSubmitting}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
