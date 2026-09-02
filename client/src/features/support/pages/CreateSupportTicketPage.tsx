import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { supportApi } from '../api/support.api';
import { TicketCategory } from '../types/support.types';
import {
  LifeBuoy,
  ArrowLeft,
  Send,
  AlertCircle,
  Package,
} from 'lucide-react';

export const CreateSupportTicketPage: React.FC = () => {
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('ORDER');
  const [relatedOrderId, setRelatedOrderId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer's orders to populate the related order selector
  const { data: customerOrders } = useQuery({
    queryKey: ['my-orders-for-support'],
    queryFn: async () => {
      const res = await api.get('/orders?limit=20');
      return res.data.data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const ticket = await supportApi.createTicket({
        subject: subject.trim(),
        category,
        message: message.trim(),
        relatedOrderId: relatedOrderId ? relatedOrderId : undefined,
      });

      navigate(`/support/${ticket.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to submit support request'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/support"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Tickets</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-indigo-500" />
          <span>Open a Support Request</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Please describe your issue with as much detail as possible so our team can assist you quickly.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ticket Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-6">
        {/* Category */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Category <span className="text-rose-400">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ORDER">Order Inquiry / Issue</option>
            <option value="SHIPPING">Shipping & Delivery</option>
            <option value="PAYMENT">Payment & Billing</option>
            <option value="RETURN">Return Request</option>
            <option value="REFUND">Refund Status</option>
            <option value="PRODUCT">Product Questions</option>
            <option value="ACCOUNT">Account & Login</option>
            <option value="PROMOTION">Promotions & Coupons</option>
            <option value="TECHNICAL">Technical Issue / Bug</option>
            <option value="OTHER">Other Questions</option>
          </select>
        </div>

        {/* Optional Related Order */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span>Related Order (Optional)</span>
          </label>
          <select
            value={relatedOrderId}
            onChange={(e) => setRelatedOrderId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- No specific order --</option>
            {customerOrders?.map((ord: any) => (
              <option key={ord._id || ord.id} value={ord._id || ord.id}>
                Order #{ord.orderNumber} - {ord.status} ({(ord.total / 100).toFixed(2)} {ord.currency})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Linking your order helps support agents locate your purchase records instantly.
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Subject <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue (e.g., Damaged item received in package)"
            minLength={5}
            maxLength={160}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="text-right text-xs text-slate-500">
            {subject.length} / 160
          </div>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Message <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Provide all relevant details regarding your inquiry..."
            rows={6}
            minLength={1}
            maxLength={5000}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
          <div className="text-right text-xs text-slate-500">
            {message.length} / 5000
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!subject.trim() || !message.trim() || isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Support Request'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
