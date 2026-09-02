import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTickets } from '../api/support.api';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketCategoryBadge } from '../components/TicketCategoryBadge';
import { TicketStatus, TicketCategory } from '../types/support.types';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const SupportTicketsPage: React.FC = () => {
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [category, setCategory] = useState<TicketCategory | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useMyTickets({
    status,
    category,
    page,
    limit: 10,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-indigo-500" />
            <span>Customer Support</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your support requests or open a new inquiry with our team.
          </p>
        </div>

        <Link
          to="/support/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Request</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={status || ''}
          onChange={(e) => {
            setStatus((e.target.value as TicketStatus) || undefined);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting on You</option>
          <option value="WAITING_FOR_SUPPORT">Waiting on Support</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={category || ''}
          onChange={(e) => {
            setCategory((e.target.value as TicketCategory) || undefined);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          <option value="ORDER">Order Issue</option>
          <option value="PAYMENT">Payment</option>
          <option value="SHIPPING">Shipping & Delivery</option>
          <option value="RETURN">Return</option>
          <option value="REFUND">Refund</option>
          <option value="PRODUCT">Product Inquiries</option>
          <option value="ACCOUNT">Account Management</option>
          <option value="PROMOTION">Promotions</option>
          <option value="TECHNICAL">Technical Issue</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading your support tickets...
        </div>
      ) : isError ? (
        <div className="p-12 text-center text-rose-400 text-sm">
          Failed to load support tickets. Please try again.
        </div>
      ) : !data?.items.length ? (
        <div className="p-16 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">No support tickets found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have any active or past support tickets matching your filters.
            </p>
          </div>
          <Link
            to="/support/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <span>Create a Ticket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="block p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {ticket.ticketNumber}
                    </span>
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                    <TicketCategoryBadge category={ticket.category} />
                    {ticket.relatedOrderNumber && (
                      <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded">
                        Order #{ticket.relatedOrderNumber}
                      </span>
                    )}
                    {ticket.customerUnreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white animate-pulse">
                        {ticket.customerUnreadCount} New Reply
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                    {ticket.subject}
                  </h3>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(ticket.lastMessageAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-400">
              <div>
                Showing page {data.pagination.page} of {data.pagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!data.pagination.hasPrevPage}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.pagination.hasNextPage}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
