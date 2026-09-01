export const PERMISSIONS = {
  // User & Admin Management
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DISABLE: 'user:disable',
  ADMIN_USER_CREATE: 'admin-user:create',
  ADMIN_USER_READ: 'admin-user:read',
  ADMIN_USER_UPDATE_ROLE: 'admin-user:update-role',
  ADMIN_USER_DISABLE: 'admin-user:disable',

  // Category
  CATEGORY_CREATE: 'category:create',
  CATEGORY_READ: 'category:read',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',

  // Brand
  BRAND_CREATE: 'brand:create',
  BRAND_READ: 'brand:read',
  BRAND_UPDATE: 'brand:update',
  BRAND_DELETE: 'brand:delete',

  // Product
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_PUBLISH: 'product:publish',

  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Order & Fulfillment
  ORDER_READ: 'order:read',
  ORDER_UPDATE: 'order:update',
  ORDER_CANCEL: 'order:cancel',
  ORDER_FULFILL: 'order:fulfill',

  // Return & Refund
  RETURN_READ: 'return:read',
  RETURN_APPROVE: 'return:approve',
  RETURN_REJECT: 'return:reject',
  REFUND_READ: 'refund:read',
  REFUND_CREATE: 'refund:create',
  REFUND_APPROVE: 'refund:approve',

  // Review & Moderation
  REVIEW_READ: 'review:read',
  REVIEW_MODERATE: 'review:moderate',
  REVIEW_DELETE: 'review:delete',

  // Promotion & Coupon
  PROMOTION_CREATE: 'promotion:create',
  PROMOTION_READ: 'promotion:read',
  PROMOTION_UPDATE: 'promotion:update',
  PROMOTION_DELETE: 'promotion:delete',
  COUPON_CREATE: 'coupon:create',
  COUPON_READ: 'coupon:read',
  COUPON_UPDATE: 'coupon:update',
  COUPON_DELETE: 'coupon:delete',

  // Support
  SUPPORT_READ: 'support:read',
  SUPPORT_UPDATE: 'support:update',
  SUPPORT_ASSIGN: 'support:assign',
  SUPPORT_CLOSE: 'support:close',

  // Payments (Module 13)
  PAYMENT_READ: 'payment:read',
  PAYMENT_CONFIRM: 'payment:confirm',
  PAYMENT_RECONCILE: 'payment:reconcile',

  // Shipping & Fulfillment (Module 14)
  SHIPPING_READ: 'shipping:read',
  SHIPPING_MANAGE: 'shipping:manage',
  SHIPPING_FULFILL: 'shipping:fulfill',

  // Analytics & Audit
  ANALYTICS_READ: 'analytics:read',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
