export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const STOCK_STATUS = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
} as const;

export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS];

export const TRANSACTION_TYPE = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  RESERVATION: 'RESERVATION',
  RELEASE: 'RELEASE',
  SALE: 'SALE',
  ORDER_CANCELLATION: 'ORDER_CANCELLATION',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];


export const REFERENCE_TYPE = {
  MANUAL: 'MANUAL',
  ORDER: 'ORDER',
  CHECKOUT: 'CHECKOUT',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  RETURN: 'RETURN',
  SYSTEM_SYNC: 'SYSTEM_SYNC',
} as const;

export type ReferenceType = (typeof REFERENCE_TYPE)[keyof typeof REFERENCE_TYPE];

