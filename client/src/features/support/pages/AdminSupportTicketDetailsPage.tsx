import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminTicketDetails,
  useStaffList,
  supportApi,
} from '../api/support.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketCategoryBadge } from '../components/TicketCategoryBadge';
import { TicketMessageItem } from '../components/TicketMessageItem';
import { StaffReplyForm } from '../components/StaffReplyForm';
import { AdminTicketSidebar } from '../components/AdminTicketSidebar';
import { ResolveTicketModal } from '../components/ResolveTicketModal';
import { TicketPriority, TicketStatus } from '../types/support.types';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const AdminSupportTicketDetailsPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: ticket,
    isLoading,
    isError,
    refetch,
  } = useAdminTicketDetails(ticketId || '');

  const { data: staffList } = useStaffList();

  // Reset staff unread counter on load
  useEffect(() => {
    if (ticketId) {
      supportApi.markStaffAsRead(ticketId).catch(() => {});
    }
  }, [ticketId]);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm">
        Loading ticket details...
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="p-16 text-center space-y-4">
        <p className="text-rose-400 text-sm">Ticket not found or access denied.</p>
        <Link
          to="/admin/support"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Support Queue</span>
        </Link>
      </div>
    );
  }

  const handleSendReply = async (messageText: string) => {
    setActionError(null);
    await supportApi.staffReply(ticket.id, messageText);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
  };

  const handleAddInternalNote = async (messageText: string) => {
    setActionError(null);
    await supportApi.addInternalNote(ticket.id, messageText);
    await refetch();
  };

  const handleAssign = async (staffUserId: string) => {
    try {
      setActionError(null);
      await supportApi.assignTicket(ticket.id, staffUserId);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Assignment failed');
    }
  };

  const handleAssignToMe = async () => {
    try {
      setActionError(null);
      await supportApi.assignToMe(ticket.id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Assignment failed');
    }
  };

  const handleUpdatePriority = async (priority: TicketPriority) => {
    try {
      setActionError(null);
      await supportApi.updatePriority(ticket.id, priority);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to update priority');
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    try {
      setActionError(null);
      await supportApi.updateStatus(ticket.id, status);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to update status');
    }
  };

  const handleConfirmResolve = async (resolutionSummary: string) => {
    setActionError(null);
    await supportApi.resolveTicket(ticket.id, resolutionSummary);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
  };

  const handleCloseTicket = async () => {
    if (window.confirm('Are you sure you want to close this ticket?')) {
      try {
        setActionError(null);
        await supportApi.adminCloseTicket(ticket.id);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'queue'] });
      } catch (err: any) {
        setActionError(err.response?.data?.message || err.message || 'Failed to close ticket');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/admin/support"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Support Queue</span>
        </Link>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main conversation column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono font-bold text-indigo-400">
                {ticket.ticketNumber}
              </span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketCategoryBadge category={ticket.category} />
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {ticket.subject}
            </h1>

            <div className="text-xs text-slate-400 flex flex-wrap gap-4 pt-1">
              <span>
                Created: {new Date(ticket.createdAt).toLocaleString()}
              </span>
              <span>
                Customer: <strong className="text-slate-200">{ticket.customer.name}</strong> ({ticket.customer.email})
              </span>
            </div>
          </div>

          {/* Conversation History */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
              Conversation & Notes
            </h3>

            <div className="space-y-1">
              {ticket.messages.map((m) => (
                <TicketMessageItem key={m.id} message={m} isStaffViewer={true} />
              ))}
            </div>
          </div>

          {/* Reply / Internal Note Form */}
          {ticket.status !== 'CLOSED' ? (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
              <StaffReplyForm
                onSendReply={handleSendReply}
                onAddInternalNote={handleAddInternalNote}
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-slate-400 text-xs">
              This ticket is closed. Reopen or update status to submit new messages.
            </div>
          )}
        </div>

        {/* Sidebar Controls (1/3) */}
        <div className="lg:col-span-1">
          <AdminTicketSidebar
            ticket={ticket}
            staffList={staffList}
            currentUserId={user?.id}
            onAssign={handleAssign}
            onAssignToMe={handleAssignToMe}
            onUpdatePriority={handleUpdatePriority}
            onUpdateStatus={handleUpdateStatus}
            onOpenResolveModal={() => setIsResolveModalOpen(true)}
            onCloseTicket={handleCloseTicket}
          />
        </div>
      </div>

      {/* Resolve Ticket Modal */}
      <ResolveTicketModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        onConfirm={handleConfirmResolve}
      />
    </div>
  );
};
