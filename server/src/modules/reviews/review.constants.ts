export const REVIEW_STATUS = {
  PUBLISHED: 'PUBLISHED',
  HIDDEN: 'HIDDEN',
  REJECTED: 'REJECTED',
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export const REVIEW_STATUS_LIST = Object.values(REVIEW_STATUS) as [ReviewStatus, ...ReviewStatus[]];

export const REVIEW_SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  RATING_HIGH: 'rating-high',
  RATING_LOW: 'rating-low',
  HELPFUL: 'helpful',
} as const;

export type ReviewSortOption = (typeof REVIEW_SORT_OPTIONS)[keyof typeof REVIEW_SORT_OPTIONS];

export const REVIEW_SORT_OPTIONS_LIST = Object.values(REVIEW_SORT_OPTIONS) as [ReviewSortOption, ...ReviewSortOption[]];

export const REVIEW_LIMITS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  BODY_MIN_LENGTH: 10,
  BODY_MAX_LENGTH: 2000,
  TITLE_MAX_LENGTH: 120,
  MODERATION_REASON_MIN_LENGTH: 5,
  MODERATION_REASON_MAX_LENGTH: 500,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
} as const;
