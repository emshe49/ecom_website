import { Types, FilterQuery } from 'mongoose';
import { Review } from './review.model.js';
import { ReviewHelpfulVote } from './review-helpful-vote.model.js';
import { Product } from '../catalog/products/product.model.js';
import { REVIEW_STATUS } from './review.constants.js';
import {
  IReview,
  PublicReviewDTO,
  CustomerReviewDTO,
  AdminReviewDTO,
  PublicReviewQueryFilters,
  CustomerReviewQueryFilters,
  AdminReviewQueryFilters,
  ProductRatingSummaryDTO,
} from './review.types.js';
import { ReviewMapper } from './review.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export class ReviewQueryService {
  /**
   * Retrieves public, published reviews for a product with pagination, sorting, and rating breakdown
   */
  async getPublicProductReviews(
    productId: string,
    filters: PublicReviewQueryFilters,
    authenticatedUserId?: string
  ): Promise<{
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
  }> {
    const prodObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(prodObjectId).select('ratingAverage ratingCount ratingDistribution');
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IReview> = {
      productId: prodObjectId,
      status: REVIEW_STATUS.PUBLISHED,
    };

    if (filters.rating) {
      query.rating = filters.rating;
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (filters.sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'rating-high':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpfulCount: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'firstName lastName')
        .populate('variantId', 'name sku attributes')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    // Query whether authenticated customer marked any of these reviews helpful
    let userVoteSet: Set<string> | undefined = undefined;
    if (authenticatedUserId && reviews.length > 0) {
      const reviewIds = reviews.map((r) => r._id);
      const userVotes = await ReviewHelpfulVote.find({
        reviewId: { $in: reviewIds },
        userId: new Types.ObjectId(authenticatedUserId),
      }).select('reviewId');

      userVoteSet = new Set(userVotes.map((v) => v.reviewId.toString()));
    }

    const dtos = reviews.map((r) => ReviewMapper.toPublicDTO(r, userVoteSet));
    const totalPages = Math.ceil(total / limit) || 1;

    const ratingSummary: ProductRatingSummaryDTO = {
      average: product.ratingAverage || 0,
      count: product.ratingCount || 0,
      distribution: product.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    return {
      reviews: dtos,
      ratingSummary,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Retrieves all reviews written by the authenticated customer
   */
  async getCustomerReviews(
    userId: string,
    filters: CustomerReviewQueryFilters
  ): Promise<{
    reviews: CustomerReviewDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const userObjectId = new Types.ObjectId(userId);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IReview> = {
      userId: userObjectId,
    };

    if (filters.status) {
      query.status = filters.status;
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (filters.sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'rating-high':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'name slug images')
        .populate('variantId', 'name sku attributes')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    const dtos = reviews.map((r) => ReviewMapper.toCustomerDTO(r));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      reviews: dtos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Administrative search & list of all customer reviews
   */
  async getAdminReviews(
    filters: AdminReviewQueryFilters
  ): Promise<{
    reviews: AdminReviewDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IReview> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.rating) {
      query.rating = filters.rating;
    }

    if (filters.productId) {
      query.productId = new Types.ObjectId(filters.productId);
    }

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    if (filters.verifiedPurchase !== undefined) {
      query.verifiedPurchase = filters.verifiedPurchase;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: searchRegex },
        { body: searchRegex },
        { moderationReason: searchRegex },
      ];
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (filters.sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'rating-high':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpfulCount: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'name slug images')
        .populate('userId', 'firstName lastName email')
        .populate('orderId', 'orderNumber')
        .populate('variantId', 'name sku attributes')
        .populate('moderatedBy', 'firstName lastName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    const dtos = reviews.map((r) => ReviewMapper.toAdminDTO(r));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      reviews: dtos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Administrative view of a single review
   */
  async getAdminReviewById(reviewId: string): Promise<AdminReviewDTO> {
    const review = await Review.findById(new Types.ObjectId(reviewId))
      .populate('productId', 'name slug images')
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'orderNumber')
      .populate('variantId', 'name sku attributes')
      .populate('moderatedBy', 'firstName lastName email');

    if (!review) {
      throw AppError.notFound('Review not found.', ErrorCodes.ERR_REVIEW_NOT_FOUND);
    }

    return ReviewMapper.toAdminDTO(review);
  }
}

export const reviewQueryService = new ReviewQueryService();
