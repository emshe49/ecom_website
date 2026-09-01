export type PaymentMethod = 'ONLINE' | 'CASH_ON_DELIVERY';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type PaymentAttemptStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PaymentAttemptDTO {
  id: string;
  attemptNumber: number;
  provider: string;
  method: PaymentMethod;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  providerPaymentId?: string;
  failureCode?: string;
  failureMessage?: string;
  initiatedAt: string;
  completedAt?: string;
}

export interface PaymentDTO {
  id: string;
  orderId: string;
  userId: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  providerTransactionId?: string;
  paidAt?: string;
  refundedAmount: number;
  attemptsCount: number;
  attempts?: PaymentAttemptDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentResultDTO {
  payment: PaymentDTO;
  attempt: PaymentAttemptDTO;
  checkoutUrl?: string;
  clientToken?: string;
}

export interface AdminPaymentListItemDTO {
  id: string;
  paymentNumber: string;
  orderId: string;
  orderNumber?: string;
  userId: string;
  customer?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  paidAt?: string;
  attemptsCount: number;
  createdAt: string;
}

export interface AdminPaymentDetailDTO extends PaymentDTO {
  orderNumber?: string;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface PaymentMethodOption {
  code: PaymentMethod;
  name: string;
  description: string;
  enabled: boolean;
  provider: string;
}

export interface PaymentQueryFilters {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  provider?: string;
  orderId?: string;
  userId?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'paidAt';
}
