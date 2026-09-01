export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type TransactionType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT'
  | 'RESERVATION'
  | 'RELEASE';

export type ReferenceType = 'MANUAL' | 'ORDER';

export interface InventoryVariantAttribute {
  name: string;
  value: string;
}

export interface InventoryItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantAttributes: InventoryVariantAttribute[];
  imageUrl: string | null;
  price: number;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  status: StockStatus;
  stockStatus: StockStatus;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransactionUser {
  id: string;
  name: string;
  email: string;
}

export interface InventoryTransaction {
  id: string;
  variantId: string;
  type: TransactionType;
  quantity: number;
  previousOnHand: number;
  newOnHand: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  referenceType: ReferenceType | null;
  referenceId: string | null;
  createdBy: InventoryTransactionUser | null;
  createdAt: string;
}

export interface StockAdjustmentPayload {
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
  quantity?: number;
  newOnHand?: number;
  reason: string;
}

export interface UpdateThresholdPayload {
  lowStockThreshold: number;
}

export type InventorySortBy =
  | 'onHand'
  | 'reserved'
  | 'available'
  | 'updatedAt'
  | 'sku'
  | 'productName';

export interface InventoryFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StockStatus;
  category?: string;
  brand?: string;
  lowStockOnly?: boolean;
  sortBy?: InventorySortBy;
  sortOrder?: 'asc' | 'desc';
}


export interface InventoryPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  pagination: InventoryPagination;
}

export interface InventoryDetailResponse {
  inventory: InventoryItem & {
    recentTransactions: InventoryTransaction[];
  };
}

export interface InventoryTransactionsResponse {
  transactions: InventoryTransaction[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
