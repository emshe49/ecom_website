import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import {
  CustomerTicketListItem,
  CustomerTicketDetail,
  StaffTicketListItem,
  StaffTicketDetail,
  SupportMessageItem,
  SupportQueueFilters,
  PaginationMeta,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/support.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationMeta;
}

// Clean empty params
function cleanParams(params: Record<string, any>) {
  const result: Record<string, any> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  });
  return result;
}

export const supportApi = {
  // Customer Endpoints
  createTicket: async (input: {
    subject: string;
    category: TicketCategory;
    message: string;
    relatedOrderId?: string;
  }): Promise<CustomerTicketDetail> => {
    const res = await api.post<ApiResponse<CustomerTicketDetail>>('/support/tickets', input);
    return res.data.data;
  },

  getMyTickets: async (params: {
    status?: TicketStatus;
    category?: TicketCategory;
    page?: number;
    limit?: number;
  }): Promise<{ items: CustomerTicketListItem[]; pagination: PaginationMeta }> => {
    const res = await api.get<ApiResponse<CustomerTicketListItem[]>>('/support/tickets', {
      params: cleanParams(params),
    });
    return {
      items: res.data.data,
      pagination: res.data.pagination!,
    };
  },

  getTicketDetails: async (ticketId: string): Promise<CustomerTicketDetail> => {
    const res = await api.get<ApiResponse<CustomerTicketDetail>>(`/support/tickets/${ticketId}`);
    return res.data.data;
  },

  replyToTicket: async (
    ticketId: string,
    message: string
  ): Promise<SupportMessageItem> => {
    const res = await api.post<ApiResponse<SupportMessageItem>>(
      `/support/tickets/${ticketId}/messages`,
      { message }
    );
    return res.data.data;
  },

  markAsRead: async (ticketId: string): Promise<void> => {
    await api.post(`/support/tickets/${ticketId}/read`);
  },

  reopenTicket: async (ticketId: string): Promise<{ status: string }> => {
    const res = await api.post<{ success: boolean; status: string }>(
      `/support/tickets/${ticketId}/reopen`
    );
    return res.data;
  },

  closeTicket: async (ticketId: string): Promise<{ status: string }> => {
    const res = await api.post<{ success: boolean; status: string }>(
      `/support/tickets/${ticketId}/close`
    );
    return res.data;
  },

  // Admin / Staff Endpoints
  getQueue: async (
    filters: SupportQueueFilters
  ): Promise<{ items: StaffTicketListItem[]; pagination: PaginationMeta }> => {
    const res = await api.get<ApiResponse<StaffTicketListItem[]>>('/admin/support/tickets', {
      params: cleanParams(filters),
    });
    return {
      items: res.data.data,
      pagination: res.data.pagination!,
    };
  },

  getAdminTicketDetails: async (ticketId: string): Promise<StaffTicketDetail> => {
    const res = await api.get<ApiResponse<StaffTicketDetail>>(
      `/admin/support/tickets/${ticketId}`
    );
    return res.data.data;
  },

  staffReply: async (
    ticketId: string,
    message: string
  ): Promise<SupportMessageItem> => {
    const res = await api.post<ApiResponse<SupportMessageItem>>(
      `/admin/support/tickets/${ticketId}/messages`,
      { message }
    );
    return res.data.data;
  },

  addInternalNote: async (
    ticketId: string,
    message: string
  ): Promise<SupportMessageItem> => {
    const res = await api.post<ApiResponse<SupportMessageItem>>(
      `/admin/support/tickets/${ticketId}/internal-notes`,
      { message }
    );
    return res.data.data;
  },

  assignTicket: async (
    ticketId: string,
    staffUserId: string
  ): Promise<{ assignedTo: string }> => {
    const res = await api.post<{ success: boolean; assignedTo: string }>(
      `/admin/support/tickets/${ticketId}/assign`,
      { staffUserId }
    );
    return res.data;
  },

  assignToMe: async (ticketId: string): Promise<{ assignedTo: string }> => {
    const res = await api.post<{ success: boolean; assignedTo: string }>(
      `/admin/support/tickets/${ticketId}/assign-to-me`
    );
    return res.data;
  },

  updatePriority: async (
    ticketId: string,
    priority: TicketPriority
  ): Promise<{ priority: string }> => {
    const res = await api.patch<{ success: boolean; priority: string }>(
      `/admin/support/tickets/${ticketId}/priority`,
      { priority }
    );
    return res.data;
  },

  updateStatus: async (
    ticketId: string,
    status: TicketStatus
  ): Promise<{ status: string }> => {
    const res = await api.patch<{ success: boolean; status: string }>(
      `/admin/support/tickets/${ticketId}/status`,
      { status }
    );
    return res.data;
  },

  resolveTicket: async (
    ticketId: string,
    resolutionSummary: string
  ): Promise<{ status: string }> => {
    const res = await api.post<{ success: boolean; status: string }>(
      `/admin/support/tickets/${ticketId}/resolve`,
      { resolutionSummary }
    );
    return res.data;
  },

  adminCloseTicket: async (ticketId: string): Promise<{ status: string }> => {
    const res = await api.post<{ success: boolean; status: string }>(
      `/admin/support/tickets/${ticketId}/close`
    );
    return res.data;
  },

  markStaffAsRead: async (ticketId: string): Promise<void> => {
    await api.post(`/admin/support/tickets/${ticketId}/read`);
  },
};

// React Query Hooks
export const useMyTickets = (params: {
  status?: TicketStatus;
  category?: TicketCategory;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ['support', 'my-tickets', params],
    queryFn: () => supportApi.getMyTickets(params),
  });

export const useTicketDetails = (ticketId: string) =>
  useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => supportApi.getTicketDetails(ticketId),
    enabled: Boolean(ticketId),
  });

export const useSupportQueue = (filters: SupportQueueFilters) =>
  useQuery({
    queryKey: ['admin', 'support', 'queue', filters],
    queryFn: () => supportApi.getQueue(filters),
  });

export const useAdminTicketDetails = (ticketId: string) =>
  useQuery({
    queryKey: ['admin', 'support', 'ticket', ticketId],
    queryFn: () => supportApi.getAdminTicketDetails(ticketId),
    enabled: Boolean(ticketId),
  });

export const useStaffList = () =>
  useQuery({
    queryKey: ['admin', 'users', 'staff'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data;
    },
  });
