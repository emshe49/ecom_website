import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupportQueue } from '../api/support.api';
import { SupportQueueFilterBar } from '../components/SupportQueueFilters';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketCategoryBadge } from '../components/TicketCategoryBadge';
import { SupportQueueFilters } from '../types/support.types';
import {
  LifeBuoy,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

export const AdminSupportTicketsPage: React.FC = () => {
  const [filters, setFilters] = useState<SupportQueueFilters>({
    page: 1,
    limit: 15,
    sort: 'lastActivity',
  });

  const { data, isLoading, isError } = useSupportQueue(filters);

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 15,
      sort: 'lastActivity',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <LifeBuoy className="w-7 h-7 text-indigo-500" />
            <span>Support Tickets Queue</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage customer inquiries, assign tickets, and resolve support requests.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <SupportQueueFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Queue Table */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          Loading support queue...
        </div>
      ) : isError ? (
        <div className="p-16 text-center text-rose-400 text-sm">
          Failed to load support tickets.
        </div>
      ) : !data?.items.length ? (
        <div className="p-16 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No tickets found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No support tickets match the selected filters or search query.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.items.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{ticket.ticketNumber}</span>
                        {ticket.staffUnreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200 truncate max-w-[140px]">
                        {ticket.customer.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {ticket.customer.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="font-medium text-slate-100 truncate">
                        {ticket.subject}
                      </div>
                      {ticket.relatedOrderNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Order #{ticket.relatedOrderNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <TicketCategoryBadge category={ticket.category} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <TicketPriorityBadge priority={ticket.priority} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <TicketStatusBadge status={ticket.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {ticket.assignedTo ? (
                        <span className="text-slate-200 font-medium">
                          {ticket.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {new Date(ticket.lastMessageAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/support/${ticket.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
              <div>
                Showing page {data.pagination.page} of {data.pagination.totalPages} (
                {data.pagination.totalItems} total tickets)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setFilters({ ...filters, page: Math.max(1, filters.page! - 1) })
                  }
                  disabled={!data.pagination.hasPrevPage}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                  disabled={!data.pagination.hasNextPage}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40"
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
