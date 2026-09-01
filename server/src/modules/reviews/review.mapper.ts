import {
  PublicReviewDTO,
  CustomerReviewDTO,
  AdminReviewDTO,
  ReviewVariantSummaryDTO,
} from './review.types.js';

export class ReviewMapper {
  /**
   * Generates a privacy-safe public display name (e.g., "Essa R." or "Ali K.")
   */
  static formatReviewerDisplayName(firstName?: string, lastName?: string): string {
    const cleanFirst = (firstName || '').trim();
    const cleanLast = (lastName || '').trim();

    if (!cleanFirst && !cleanLast) {
      return 'Verified Customer';
    }

    if (cleanFirst && cleanLast) {
      return `${cleanFirst} ${cleanLast.charAt(0).toUpperCase()}.`;
    }

    if (cleanFirst) {
      return cleanFirst;
    }

    return `${cleanLast.charAt(0).toUpperCase()}.`;
  }

  /**
   * Maps a populated/aggregated review document to a public-safe DTO
   */
  static toPublicDTO(
    review: any,
    userVoteSet?: Set<string>
  ): PublicReviewDTO {
    const reviewId = review._id.toString();
    const userDoc = review.userId && typeof review.userId === 'object' ? review.userId : null;

    let variantSummary: ReviewVariantSummaryDTO | null = null;
    if (review.variantId && typeof review.variantId === 'object') {
      const v = review.variantId;
      const attrStr = (v.attributes || [])
        .map((a: any) => `${a.name}: ${a.value}`)
        .join(', ');
      variantSummary = {
        id: v._id?.toString(),
        name: v.name || attrStr || 'Standard',
        sku: v.sku || '',
      };
    } else if (review.variantSummary) {
      variantSummary = review.variantSummary;
    }

    return {
      id: reviewId,
      rating: review.rating,
      title: review.title || null,
      body: review.body,
      verifiedPurchase: review.verifiedPurchase ?? true,
      variantSummary,
      reviewer: {
        displayName: this.formatReviewerDisplayName(userDoc?.firstName, userDoc?.lastName),
      },
      helpfulCount: review.helpfulCount || 0,
      isHelpfulByUser: userVoteSet ? userVoteSet.has(reviewId) : false,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: review.updatedAt ? new Date(review.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Maps review to customer account review history DTO
   */
  static toCustomerDTO(review: any): CustomerReviewDTO {
    const reviewId = review._id.toString();
    const productDoc = review.productId && typeof review.productId === 'object' ? review.productId : null;

    let primaryImage: string | null = null;
    if (productDoc?.images && Array.isArray(productDoc.images)) {
      const primary = productDoc.images.find((img: any) => img.isPrimary);
      primaryImage = primary?.url || productDoc.images[0]?.url || null;
    }

    let variantSummary: ReviewVariantSummaryDTO | null = null;
    if (review.variantId && typeof review.variantId === 'object') {
      const v = review.variantId;
      const attrStr = (v.attributes || [])
        .map((a: any) => `${a.name}: ${a.value}`)
        .join(', ');
      variantSummary = {
        id: v._id?.toString(),
        name: v.name || attrStr || 'Standard',
        sku: v.sku || '',
      };
    }

    return {
      id: reviewId,
      productId: productDoc ? productDoc._id.toString() : (review.productId?.toString() || ''),
      product: {
        id: productDoc ? productDoc._id.toString() : (review.productId?.toString() || ''),
        name: productDoc?.name || 'Product',
        slug: productDoc?.slug || '',
        primaryImage,
      },
      variantSummary,
      rating: review.rating,
      title: review.title || null,
      body: review.body,
      status: review.status,
      verifiedPurchase: review.verifiedPurchase ?? true,
      helpfulCount: review.helpfulCount || 0,
      moderationReason: review.moderationReason || null,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: review.updatedAt ? new Date(review.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Maps review to administrative detailed DTO
   */
  static toAdminDTO(review: any): AdminReviewDTO {
    const reviewId = review._id.toString();
    const productDoc = review.productId && typeof review.productId === 'object' ? review.productId : null;
    const userDoc = review.userId && typeof review.userId === 'object' ? review.userId : null;
    const orderDoc = review.orderId && typeof review.orderId === 'object' ? review.orderId : null;
    const moderatorDoc = review.moderatedBy && typeof review.moderatedBy === 'object' ? review.moderatedBy : null;

    let primaryImage: string | null = null;
    if (productDoc?.images && Array.isArray(productDoc.images)) {
      const primary = productDoc.images.find((img: any) => img.isPrimary);
      primaryImage = primary?.url || productDoc.images[0]?.url || null;
    }

    let variantSummary: ReviewVariantSummaryDTO | null = null;
    if (review.variantId && typeof review.variantId === 'object') {
      const v = review.variantId;
      const attrStr = (v.attributes || [])
        .map((a: any) => `${a.name}: ${a.value}`)
        .join(', ');
      variantSummary = {
        id: v._id?.toString(),
        name: v.name || attrStr || 'Standard',
        sku: v.sku || '',
      };
    }

    return {
      id: reviewId,
      productId: productDoc ? productDoc._id.toString() : (review.productId?.toString() || ''),
      product: {
        id: productDoc ? productDoc._id.toString() : (review.productId?.toString() || ''),
        name: productDoc?.name || 'Product',
        slug: productDoc?.slug || '',
        primaryImage,
      },
      userId: userDoc ? userDoc._id.toString() : (review.userId?.toString() || ''),
      customer: {
        id: userDoc ? userDoc._id.toString() : (review.userId?.toString() || ''),
        firstName: userDoc?.firstName || '',
        lastName: userDoc?.lastName || '',
        email: userDoc?.email || '',
      },
      orderId: orderDoc ? orderDoc._id.toString() : (review.orderId?.toString() || ''),
      orderNumber: orderDoc?.orderNumber || null,
      variantId: review.variantId ? (typeof review.variantId === 'object' ? review.variantId._id?.toString() : review.variantId.toString()) : null,
      variantSummary,
      rating: review.rating,
      title: review.title || null,
      body: review.body,
      status: review.status,
      verifiedPurchase: review.verifiedPurchase ?? true,
      helpfulCount: review.helpfulCount || 0,
      moderationReason: review.moderationReason || null,
      moderatedBy: moderatorDoc ? `${moderatorDoc.firstName || ''} ${moderatorDoc.lastName || ''}`.trim() || moderatorDoc.email : (review.moderatedBy?.toString() || null),
      moderatedAt: review.moderatedAt ? new Date(review.moderatedAt).toISOString() : null,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: review.updatedAt ? new Date(review.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}
