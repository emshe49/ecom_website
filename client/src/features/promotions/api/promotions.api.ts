import api from '../../../services/api';
import {
  CouponDTO,
  PromotionDTO,
  CouponRedemptionDTO,
  CreateCouponInput,
  UpdateCouponInput,
  CreatePromotionInput,
  UpdatePromotionInput,
  PaginatedResult,
} from '../types/promotions.types';
import { CheckoutSession } from '../../checkout/types/checkout.types';

export const promotionsApi = {
  // Customer Checkout Endpoints
  applyCoupon: async (code: string): Promise<CheckoutSession> => {
    const response = await api.post<{ success: boolean; data: CheckoutSession }>(
      '/checkout/coupon',
      { code }
    );
    return response.data.data;
  },

  removeCoupon: async (): Promise<CheckoutSession> => {
    const response = await api.delete<{ success: boolean; data: CheckoutSession }>(
      '/checkout/coupon'
    );
    return response.data.data;
  },

  // Admin Coupon Endpoints
  getAdminCoupons: async (params?: {
    search?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<CouponDTO>> => {
    const response = await api.get<{
      success: boolean;
      data: CouponDTO[];
      pagination: PaginatedResult<CouponDTO>['pagination'];
    }>('/admin/coupons', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  getAdminCouponById: async (id: string): Promise<CouponDTO> => {
    const response = await api.get<{ success: boolean; data: CouponDTO }>(
      `/admin/coupons/${id}`
    );
    return response.data.data;
  },

  createAdminCoupon: async (input: CreateCouponInput): Promise<CouponDTO> => {
    const response = await api.post<{ success: boolean; data: CouponDTO }>(
      '/admin/coupons',
      input
    );
    return response.data.data;
  },

  updateAdminCoupon: async (
    id: string,
    input: UpdateCouponInput
  ): Promise<CouponDTO> => {
    const response = await api.patch<{ success: boolean; data: CouponDTO }>(
      `/admin/coupons/${id}`,
      input
    );
    return response.data.data;
  },

  getAdminCouponRedemptions: async (
    couponId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<CouponRedemptionDTO>> => {
    const response = await api.get<{
      success: boolean;
      data: CouponRedemptionDTO[];
      pagination: PaginatedResult<CouponRedemptionDTO>['pagination'];
    }>(`/admin/coupons/${couponId}/redemptions`, { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Admin Promotion Endpoints
  getAdminPromotions: async (params?: {
    search?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<PromotionDTO>> => {
    const response = await api.get<{
      success: boolean;
      data: PromotionDTO[];
      pagination: PaginatedResult<PromotionDTO>['pagination'];
    }>('/admin/promotions', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  getAdminPromotionById: async (id: string): Promise<PromotionDTO> => {
    const response = await api.get<{ success: boolean; data: PromotionDTO }>(
      `/admin/promotions/${id}`
    );
    return response.data.data;
  },

  createAdminPromotion: async (
    input: CreatePromotionInput
  ): Promise<PromotionDTO> => {
    const response = await api.post<{ success: boolean; data: PromotionDTO }>(
      '/admin/promotions',
      input
    );
    return response.data.data;
  },

  updateAdminPromotion: async (
    id: string,
    input: UpdatePromotionInput
  ): Promise<PromotionDTO> => {
    const response = await api.patch<{ success: boolean; data: PromotionDTO }>(
      `/admin/promotions/${id}`,
      input
    );
    return response.data.data;
  },
};
