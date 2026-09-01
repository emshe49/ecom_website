import { StockStatus, TransactionType, ReferenceType } from './inventory.constants.js';

export interface InventoryVariantAttribute {
  name: string;
  value: string;
}

export interface InventoryItemDTO {
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


export interface InventoryDetailDTO extends InventoryItemDTO {
  recentTransactions: InventoryTransactionDTO[];
}

export interface InventoryTransactionDTO {
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
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface StockAdjustmentDTO {
  type: TransactionType;
  quantity?: number;
  newOnHand?: number;
  reason: string;
}

export interface UpdateThresholdDTO {
  lowStockThreshold: number;
}

export interface InventoryFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: StockStatus;
  category?: string;
  brand?: string;
  lowStockOnly?: boolean;
  sortBy?: 'onHand' | 'reserved' | 'available' | 'updatedAt' | 'sku' | 'productName';
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryListResponse {
  items: InventoryItemDTO[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
