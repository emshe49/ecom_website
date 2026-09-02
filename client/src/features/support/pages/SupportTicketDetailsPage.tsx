import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTicketDetails, supportApi } from '../api/support.api';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketCategoryBadge } from '../components/TicketCategoryBadge';
import { TicketMessageItem } from '../components/TicketMessageItem';
import { CustomerReplyForm } from '../components/CustomerReplyForm';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export const SupportTicketDetailsPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, isError, refetch } = useTicketDetails(ticketId || '');

  // Automatically mark as read when customer views detail
  useEffect(() => {
    if (ticketId) {
      supportApi.markAsRead(ticketId).catch(() => {});
    }
  }, [ticketId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400 text-sm">
        Loading ticket details...
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-rose-400 text-sm">Support ticket not found or access denied.</p>
        <Link
          to="/support"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Tickets</span>
        </Link>
      </div>
    );
  }

  const handleSendReply = async (messageText: string) => {
    await supportApi.replyToTicket(ticket.id, messageText);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['support', 'my-tickets'] });
  };

  const handleReopen = async () => {
    await supportApi.reopenTicket(ticket.id);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['support', 'my-tickets'] });
  };

  const handleClose = async () => {
    if (window.confirm('Are you sure you want to close this ticket?')) {
      await supportApi.closeTicket(ticket.id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['support', 'my-tickets'] });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
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

      {/* Ticket Header Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-mono font-bold text-indigo-400">
              {ticket.ticketNumber}
            </span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketCategoryBadge category={ticket.category} />
          </div>

          {ticket.status === 'RESOLVED' && (
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              Confirm & Close Ticket
            </button>
          )}
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {ticket.subject}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Submitted on {new Date(ticket.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Linked Order Banner */}
        {ticket.relatedOrder && (
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950 text-xs">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-slate-300 font-medium">
                  Linked to Order #{ticket.relatedOrder.orderNumber}
                </span>
                <span className="text-slate-500 ml-2">
                  ({ticket.relatedOrder.status}, {(ticket.relatedOrder.total / 100).toFixed(2)} {ticket.relatedOrder.currency})
                </span>
              </div>
            </div>
            <Link
              to={`/orders/${ticket.relatedOrder.orderId}`}
              className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-medium"
            >
              <span>View Order</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Resolution Summary Banner */}
        {ticket.resolutionSummary && (
          <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Resolution Information</span>
            </div>
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
              {ticket.resolutionSummary}
            </p>
          </div>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
          Conversation History
        </h2>

        <div className="space-y-1 divide-y divide-slate-800/40">
          {ticket.messages.map((message) => (
            <TicketMessageItem key={message.id} message={message} isStaffViewer={false} />
          ))}
        </div>
      </div>

      {/* Reply Form / Reopen Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <CustomerReplyForm
          ticketStatus={ticket.status}
          canReopen={ticket.canReopen}
          onSendReply={handleSendReply}
          onReopen={handleReopen}
        />
      </div>
    </div>
  );
};
