import React from 'react';
import { Link } from 'react-router-dom';
import {
  StaffTicketDetail,
  TicketPriority,
  TicketStatus,
} from '../types/support.types';
import {
  User,
  UserCheck,
  CheckCircle,
  ExternalLink,
  History,
} from 'lucide-react';

export const AdminTicketSidebar: React.FC<{
  ticket: StaffTicketDetail;
  staffList?: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  currentUserId?: string;
  onAssign: (staffUserId: string) => Promise<void>;
  onAssignToMe: () => Promise<void>;
  onUpdatePriority: (priority: TicketPriority) => Promise<void>;
  onUpdateStatus: (status: TicketStatus) => Promise<void>;
  onOpenResolveModal: () => void;
  onCloseTicket: () => Promise<void>;
}> = ({
  ticket,
  staffList = [],
  currentUserId,
  onAssign,
  onAssignToMe,
  onUpdatePriority,
  onUpdateStatus,
  onOpenResolveModal,
  onCloseTicket,
}) => {
  const isAssignedToMe = ticket.assignedTo?.id === currentUserId;

  return (
    <div className="space-y-6">
      {/* 1. Status & Resolution Actions */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Ticket Lifecycle
        </h4>

        <div className="space-y-2">
          <label className="block text-xs text-slate-400 font-medium">Status</label>
          <select
            value={ticket.status}
            onChange={(e) => {
              const newStatus = e.target.value as TicketStatus;
              if (newStatus === 'RESOLVED') {
                onOpenResolveModal();
              } else if (newStatus === 'CLOSED') {
                onCloseTicket();
              } else {
                onUpdateStatus(newStatus);
              }
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_CUSTOMER">Waiting on Customer</option>
            <option value="WAITING_FOR_SUPPORT">Waiting on Support</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <button
              type="button"
              onClick={onOpenResolveModal}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:bg-teal-600/30 text-xs font-semibold transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Resolve</span>
            </button>
          )}

          {ticket.status !== 'CLOSED' && (
            <button
              type="button"
              onClick={onCloseTicket}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Priority & Assignment */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Assignment & Priority
        </h4>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400 font-medium">Priority</label>
          <select
            value={ticket.priority}
            onChange={(e) => onUpdatePriority(e.target.value as TicketPriority)}
            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Assignee */}
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400 font-medium">Assigned Agent</label>
          <select
            value={ticket.assignedTo?.id || ''}
            onChange={(e) => {
              if (e.target.value) {
                onAssign(e.target.value);
              }
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Unassigned</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>
                {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email}
              </option>
            ))}
          </select>

          {!isAssignedToMe && (
            <button
              type="button"
              onClick={onAssignToMe}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assign to Me</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Customer Information */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Customer
        </h4>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate">
              {ticket.customer.name}
            </div>
            <div className="text-xs text-slate-400 truncate">{ticket.customer.email}</div>
          </div>
        </div>
      </div>

      {/* 4. Related Domain Entities (Strictly links to existing domain modules) */}
      {(ticket.relatedOrder || ticket.relatedPayment || ticket.relatedShipment) && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Linked Entities
          </h4>

          {ticket.relatedOrder && (
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-400">Order</span>
                <Link
                  to={`/admin/orders/${ticket.relatedOrder.orderId}`}
                  className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{ticket.relatedOrder.orderNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="text-slate-400 text-[11px] flex justify-between">
                <span>Status: {ticket.relatedOrder.status}</span>
                <span>
                  {(ticket.relatedOrder.total / 100).toFixed(2)} {ticket.relatedOrder.currency}
                </span>
              </div>
            </div>
          )}

          {ticket.relatedPayment && (
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-400">Payment</span>
                <Link
                  to={`/admin/payments/${ticket.relatedPayment.paymentId}`}
                  className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{ticket.relatedPayment.paymentNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="text-slate-400 text-[11px] flex justify-between">
                <span>Status: {ticket.relatedPayment.status}</span>
                <span>Method: {ticket.relatedPayment.method}</span>
              </div>
            </div>
          )}

          {ticket.relatedShipment && (
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-400">Shipment</span>
                <Link
                  to={`/admin/shipments/${ticket.relatedShipment.shipmentId}`}
                  className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{ticket.relatedShipment.shipmentNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="text-slate-400 text-[11px] flex justify-between">
                <span>Status: {ticket.relatedShipment.status}</span>
                <span>Carrier: {ticket.relatedShipment.carrier || 'Standard'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Resolution Details (if resolved) */}
      {ticket.resolutionSummary && (
        <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/10 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Resolution Summary</span>
          </div>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
            {ticket.resolutionSummary}
          </p>
          {ticket.resolvedBy && (
            <div className="text-[11px] text-slate-400 pt-1 border-t border-teal-500/20">
              Resolved by {ticket.resolvedBy.name}
            </div>
          )}
        </div>
      )}

      {/* 6. Audit History Timeline */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <History className="w-3.5 h-3.5" />
          <span>Audit History</span>
        </div>
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {ticket.history.map((h) => (
            <div key={h.id} className="text-xs border-l-2 border-slate-700 pl-2.5 py-0.5 space-y-0.5">
              <div className="font-medium text-slate-200">
                {h.action.replace('_', ' ')}
              </div>
              <div className="text-[11px] text-slate-400">
                by {h.actorName} ({h.actorType})
              </div>
              <div className="text-[10px] text-slate-500">
                {new Date(h.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
