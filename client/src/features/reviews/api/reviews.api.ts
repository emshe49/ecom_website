import api from '../../../services/api';
import {
  PublicReviewDTO,
  CustomerReviewDTO,
  AdminReviewDTO,
  EligibleProductToReviewDTO,
  ProductRatingSummaryDTO,
  CreateReviewInput,
  UpdateReviewInput,
  ModerateReviewInput,
  PublicReviewQueryParams,
  CustomerReviewQueryParams,
  AdminReviewQueryParams,
  PublicProductReviewsResponse,
  PaginatedReviewsResponse,
} from '../types/review.types';

export const reviewsApi = {
  // ==========================================
  // Public Product Reviews
  // ==========================================

  /**
   * Fetch public reviews and rating summary for a product.
   */
  getProductReviews: async (
    productId: string,
    params?: PublicReviewQueryParams
  ): Promise<PublicProductReviewsResponse> => {
    const response = await api.get<{
      success: boolean;
      data: PublicReviewDTO[];
      ratingSummary: ProductRatingSummaryDTO;
      pagination: PublicProductReviewsResponse['pagination'];
    }>(`/reviews/product/${productId}`, { params });

    return {
      reviews: response.data.data,
      ratingSummary: response.data.ratingSummary,
      pagination: response.data.pagination,
    };
  },

  // ==========================================
  // Customer Review Management
  // ==========================================

  /**
   * Create a new verified customer review.
   */
  createReview: async (input: CreateReviewInput): Promise<CustomerReviewDTO> => {
    const response = await api.post<{
      success: boolean;
      data: CustomerReviewDTO;
      message: string;
    }>('/reviews', input);
    return response.data.data;
  },

  /**
   * Update an existing review by owner.
   */
  updateReview: async (
    reviewId: string,
    input: UpdateReviewInput
  ): Promise<CustomerReviewDTO> => {
    const response = await api.patch<{
      success: boolean;
      data: CustomerReviewDTO;
      message: string;
    }>(`/reviews/${reviewId}`, input);
    return response.data.data;
  },

  /**
   * Delete an existing review by owner.
   */
  deleteReview: async (reviewId: string): Promise<void> => {
    await api.delete(`/reviews/${reviewId}`);
  },

  /**
   * Fetch authenticated customer's review history.
   */
  getMyReviews: async (
    params?: CustomerReviewQueryParams
  ): Promise<PaginatedReviewsResponse<CustomerReviewDTO>> => {
    const response = await api.get<{
      success: boolean;
      data: CustomerReviewDTO[];
      pagination: PaginatedReviewsResponse<CustomerReviewDTO>['pagination'];
    }>('/reviews/me', { params });

    return {
      reviews: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Fetch purchased products eligible for review.
   */
  getEligibleProducts: async (): Promise<EligibleProductToReviewDTO[]> => {
    const response = await api.get<{
      success: boolean;
      data: EligibleProductToReviewDTO[];
    }>('/reviews/eligible-products');
    return response.data.data;
  },

  /**
   * Mark a review as helpful.
   */
  markHelpful: async (
    reviewId: string
  ): Promise<{ helpfulCount: number; isHelpfulByUser: boolean }> => {
    const response = await api.post<{
      success: boolean;
      data: { helpfulCount: number; isHelpfulByUser: boolean };
    }>(`/reviews/${reviewId}/helpful`);
    return response.data.data;
  },

  /**
   * Remove a helpful vote.
   */
  removeHelpful: async (
    reviewId: string
  ): Promise<{ helpfulCount: number; isHelpfulByUser: boolean }> => {
    const response = await api.delete<{
      success: boolean;
      data: { helpfulCount: number; isHelpfulByUser: boolean };
    }>(`/reviews/${reviewId}/helpful`);
    return response.data.data;
  },

  // ==========================================
  // Admin Review Moderation
  // ==========================================

  /**
   * Administrative list and filter reviews.
   */
  getAdminReviews: async (
    params?: AdminReviewQueryParams
  ): Promise<PaginatedReviewsResponse<AdminReviewDTO>> => {
    const response = await api.get<{
      success: boolean;
      data: AdminReviewDTO[];
      pagination: PaginatedReviewsResponse<AdminReviewDTO>['pagination'];
    }>('/admin/reviews', { params });

    return {
      reviews: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Administrative single review view.
   */
  getAdminReviewById: async (reviewId: string): Promise<AdminReviewDTO> => {
    const response = await api.get<{
      success: boolean;
      data: AdminReviewDTO;
    }>(`/admin/reviews/${reviewId}`);
    return response.data.data;
  },

  /**
   * Administrative review moderation status update.
   */
  moderateReview: async (
    reviewId: string,
    input: ModerateReviewInput
  ): Promise<AdminReviewDTO> => {
    const response = await api.patch<{
      success: boolean;
      data: AdminReviewDTO;
      message: string;
    }>(`/admin/reviews/${reviewId}/status`, input);
    return response.data.data;
  },
};
