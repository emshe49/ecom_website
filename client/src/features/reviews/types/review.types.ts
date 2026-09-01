export type ReviewStatusType = 'PUBLISHED' | 'HIDDEN' | 'REJECTED';

export type ReviewSortType = 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful';

export interface ReviewVariantSummaryDTO {
  id?: string;
  name: string;
  sku: string;
}

export interface ProductRatingSummaryDTO {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface PublicReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  variantSummary: ReviewVariantSummaryDTO | null;
  reviewer: {
    displayName: string;
  };
  helpfulCount: number;
  isHelpfulByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReviewDTO {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    primaryImage: string | null;
  };
  variantSummary: ReviewVariantSummaryDTO | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatusType;
  verifiedPurchase: boolean;
  helpfulCount: number;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewDTO {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    primaryImage: string | null;
  };
  userId: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  orderId: string;
  orderNumber: string | null;
  variantId: string | null;
  variantSummary: ReviewVariantSummaryDTO | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatusType;
  verifiedPurchase: boolean;
  helpfulCount: number;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EligibleProductToReviewDTO {
  productId: string;
  productName: string;
  productSlug: string;
  primaryImage: string | null;
  variantSummary?: {
    name: string;
    sku: string;
  } | null;
  orderNumber: string;
  deliveredAt: string;
}

export interface CreateReviewInput {
  productId: string;
  rating: number;
  title?: string | null;
  body: string;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string | null;
  body?: string;
}

export interface ModerateReviewInput {
  status: ReviewStatusType;
  reason?: string | null;
}

export interface PublicReviewQueryParams {
  page?: number;
  limit?: number;
  rating?: number;
  sort?: ReviewSortType;
}

export interface CustomerReviewQueryParams {
  page?: number;
  limit?: number;
  status?: ReviewStatusType;
  sort?: string;
}

export interface AdminReviewQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReviewStatusType;
  rating?: number;
  productId?: string;
  userId?: string;
  verifiedPurchase?: boolean;
  sort?: string;
}

export interface PaginatedReviewsResponse<T> {
  reviews: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PublicProductReviewsResponse {
  reviews: PublicReviewDTO[];
  ratingSummary: ProductRatingSummaryDTO;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
