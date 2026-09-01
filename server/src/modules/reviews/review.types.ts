import { Types, Document } from 'mongoose';
import { ReviewStatus, ReviewSortOption } from './review.constants.js';

export interface IReview extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  rating: number;
  title?: string | null;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  helpfulCount: number;
  moderationReason?: string | null;
  moderatedBy?: Types.ObjectId | null;
  moderatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewHelpfulVote extends Document {
  _id: Types.ObjectId;
  reviewId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

export interface ReviewVariantSummaryDTO {
  id?: string;
  name: string;
  sku: string;
}

export interface PublicReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  variantSummary?: ReviewVariantSummaryDTO | null;
  reviewer: {
    displayName: string;
  };
  helpfulCount: number;
  isHelpfulByUser?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReviewProductSummaryDTO {
  id: string;
  name: string;
  slug: string;
  primaryImage: string | null;
}

export interface CustomerReviewDTO {
  id: string;
  productId: string;
  product: CustomerReviewProductSummaryDTO;
  variantSummary?: ReviewVariantSummaryDTO | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  helpfulCount: number;
  moderationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewCustomerSummaryDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AdminReviewDTO {
  id: string;
  productId: string;
  product: CustomerReviewProductSummaryDTO;
  userId: string;
  customer: AdminReviewCustomerSummaryDTO;
  orderId: string;
  orderNumber?: string | null;
  variantId?: string | null;
  variantSummary?: ReviewVariantSummaryDTO | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  helpfulCount: number;
  moderationReason?: string | null;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EligibleProductToReviewDTO {
  productId: string;
  productName: string;
  productSlug: string;
  primaryImage: string | null;
  variantSummary?: ReviewVariantSummaryDTO | null;
  orderNumber: string;
  deliveredAt: string;
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
  status: ReviewStatus;
  reason?: string | null;
}

export interface PublicReviewQueryFilters {
  page?: number;
  limit?: number;
  rating?: number;
  sort?: ReviewSortOption;
}

export interface CustomerReviewQueryFilters {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  sort?: 'newest' | 'oldest' | 'rating-high' | 'rating-low';
}

export interface AdminReviewQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReviewStatus;
  rating?: number;
  productId?: string;
  userId?: string;
  verifiedPurchase?: boolean;
  sort?: 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful';
}
