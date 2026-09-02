export const AUDIT_CATEGORY = {
  AUTH: 'AUTH',
  SECURITY: 'SECURITY',
  USER: 'USER',
  RBAC: 'RBAC',
  CATALOG: 'CATALOG',
  INVENTORY: 'INVENTORY',
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  SHIPPING: 'SHIPPING',
  REVIEW: 'REVIEW',
  PROMOTION: 'PROMOTION',
  RETURN: 'RETURN',
  REFUND: 'REFUND',
  EMAIL: 'EMAIL',
  SUPPORT: 'SUPPORT',
  SYSTEM: 'SYSTEM',
} as const;

export type AuditCategory = (typeof AUDIT_CATEGORY)[keyof typeof AUDIT_CATEGORY];

export const ACTOR_TYPE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
  WEBHOOK: 'WEBHOOK',
  JOB: 'JOB',
} as const;

export type ActorType = (typeof ACTOR_TYPE)[keyof typeof ACTOR_TYPE];

export const AUDIT_OUTCOME = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  DENIED: 'DENIED',
} as const;

export type AuditOutcome = (typeof AUDIT_OUTCOME)[keyof typeof AUDIT_OUTCOME];

export const AUDIT_EVENT_TYPE = {
  // Authentication Events
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_LOGOUT_ALL: 'auth.logout_all',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  AUTH_PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
  AUTH_EMAIL_VERIFIED: 'auth.email_verified',

  // Security Events
  SECURITY_PERMISSION_DENIED: 'security.permission.denied',
  SECURITY_RATE_LIMIT_TRIGGERED: 'security.rate_limit.triggered',

  // User & RBAC Events
  USER_PROFILE_UPDATED: 'user.profile.updated',
  USER_STATUS_CHANGED: 'user.status.changed',
  USER_CREATED_BY_ADMIN: 'user.created_by_admin',
  RBAC_ROLE_CHANGED: 'rbac.role.changed',

  // Catalog Events
  CATALOG_PRODUCT_CREATED: 'catalog.product.created',
  CATALOG_PRODUCT_UPDATED: 'catalog.product.updated',
  CATALOG_PRODUCT_STATUS_CHANGED: 'catalog.product.status_changed',
  CATALOG_VARIANT_CREATED: 'catalog.variant.created',
  CATALOG_VARIANT_UPDATED: 'catalog.variant.updated',
  CATALOG_CATEGORY_CREATED: 'catalog.category.created',
  CATALOG_CATEGORY_UPDATED: 'catalog.category.updated',
  CATALOG_CATEGORY_DELETED: 'catalog.category.deleted',
  CATALOG_BRAND_CREATED: 'catalog.brand.created',
  CATALOG_BRAND_UPDATED: 'catalog.brand.updated',

  // Inventory Events
  INVENTORY_ADJUSTED: 'inventory.adjusted',
  INVENTORY_THRESHOLD_CHANGED: 'inventory.threshold_changed',
  INVENTORY_STOCK_RESERVED: 'inventory.stock_reserved',
  INVENTORY_STOCK_RELEASED: 'inventory.stock_released',

  // Order Events
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_CANCELLED: 'order.cancelled',

  // Payment Events
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_COD_CONFIRMED: 'payment.cod_confirmed',
  PAYMENT_RETRY_REQUESTED: 'payment.retry_requested',

  // Shipping Events
  SHIPPING_SHIPMENT_CREATED: 'shipping.shipment.created',
  SHIPPING_STATUS_CHANGED: 'shipping.status_changed',
  SHIPPING_TRACKING_UPDATED: 'shipping.tracking_updated',

  // Review Events
  REVIEW_CREATED: 'review.created',
  REVIEW_UPDATED: 'review.updated',
  REVIEW_DELETED: 'review.deleted',
  REVIEW_MODERATED: 'review.moderated',

  // Promotion Events
  PROMOTION_COUPON_CREATED: 'promotion.coupon.created',
  PROMOTION_COUPON_UPDATED: 'promotion.coupon.updated',
  PROMOTION_COUPON_DEACTIVATED: 'promotion.coupon.deactivated',
  PROMOTION_CAMPAIGN_CREATED: 'promotion.campaign.created',
  PROMOTION_CAMPAIGN_UPDATED: 'promotion.campaign.updated',

  // Return & Refund Events
  RETURN_REQUESTED: 'return.requested',
  RETURN_APPROVED: 'return.approved',
  RETURN_REJECTED: 'return.rejected',
  RETURN_RECEIVED: 'return.received',
  RETURN_COMPLETED: 'return.completed',
  REFUND_CREATED: 'refund.created',
  REFUND_SUCCEEDED: 'refund.succeeded',
  REFUND_FAILED: 'refund.failed',
  REFUND_RETRY_REQUESTED: 'refund.retry_requested',

  // Email Events
  EMAIL_RETRY_REQUESTED: 'email.retry_requested',

  // Support Events
  SUPPORT_TICKET_CREATED: 'support.ticket.created',
  SUPPORT_TICKET_ASSIGNED: 'support.ticket.assigned',
  SUPPORT_TICKET_REASSIGNED: 'support.ticket.reassigned',
  SUPPORT_TICKET_PRIORITY_CHANGED: 'support.ticket.priority_changed',
  SUPPORT_TICKET_STATUS_CHANGED: 'support.ticket.status_changed',
  SUPPORT_TICKET_RESOLVED: 'support.ticket.resolved',
  SUPPORT_TICKET_CLOSED: 'support.ticket.closed',
  SUPPORT_TICKET_REOPENED: 'support.ticket.reopened',
  SUPPORT_INTERNAL_NOTE_CREATED: 'support.internal_note.created',
} as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPE)[keyof typeof AUDIT_EVENT_TYPE];

export const TARGET_TYPE = {
  USER: 'USER',
  PRODUCT: 'PRODUCT',
  PRODUCT_VARIANT: 'PRODUCT_VARIANT',
  CATEGORY: 'CATEGORY',
  BRAND: 'BRAND',
  INVENTORY: 'INVENTORY',
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  SHIPMENT: 'SHIPMENT',
  REVIEW: 'REVIEW',
  COUPON: 'COUPON',
  PROMOTION: 'PROMOTION',
  RETURN: 'RETURN',
  REFUND: 'REFUND',
  EMAIL_MESSAGE: 'EMAIL_MESSAGE',
  SUPPORT_TICKET: 'SUPPORT_TICKET',
  SECURITY: 'SECURITY',
} as const;

export type TargetType = (typeof TARGET_TYPE)[keyof typeof TARGET_TYPE];

export const AUDIT_CONSTANTS = {
  MAX_USER_AGENT_LENGTH: 512,
  MAX_METADATA_BYTES: 32 * 1024, // 32 KB
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  DEFAULT_DATE_RANGE_DAYS: 30,
  MAX_DATE_RANGE_DAYS: 365,
  MAX_EXPORT_ROWS: 50000,
  GENESIS_HASH: '0'.repeat(64),
} as const;

// Safe field allowlists for snapshot storage per domain
export const SNAPSHOT_ALLOWLISTS: Record<string, string[]> = {
  USER: ['email', 'role', 'isActive', 'firstName', 'lastName'],
  RBAC: ['role', 'previousRole'],
  ORDER: ['status', 'paymentStatus', 'fulfillmentStatus', 'totalAmount', 'cancellationReason'],
  INVENTORY: ['onHand', 'reserved', 'lowStockThreshold', 'reason'],
  PRODUCT: ['name', 'slug', 'status', 'categoryId', 'brandId', 'isFeatured', 'pricing'],
  VARIANT: ['sku', 'price', 'compareAtPrice', 'stock', 'isActive'],
  CATEGORY: ['name', 'slug', 'isActive', 'parentId'],
  BRAND: ['name', 'slug', 'isActive'],
  SHIPMENT: ['status', 'trackingNumber', 'carrier', 'dispatchedAt', 'deliveredAt'],
  REVIEW: ['status', 'moderationReason', 'moderatedBy'],
  COUPON: ['code', 'discountType', 'discountValue', 'isActive', 'usageLimit', 'startsAt', 'expiresAt'],
  PROMOTION: ['name', 'discountType', 'discountValue', 'isActive', 'startDate', 'endDate'],
  SUPPORT_TICKET: ['status', 'priority', 'assignedTo', 'resolutionSummary'],
  REFUND: ['status', 'amount', 'reason', 'method'],
};
