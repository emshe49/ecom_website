export const DASHBOARD_INTERVAL = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type DashboardInterval =
  (typeof DASHBOARD_INTERVAL)[keyof typeof DASHBOARD_INTERVAL];

export const DASHBOARD_CONSTANTS = {
  DEFAULT_RANGE_DAYS: 30,
  MAX_RANGE_DAYS: 366,
  RECENT_ORDERS_LIMIT: 10,
  LOW_STOCK_LIMIT: 10,
  DEFAULT_LOW_STOCK_THRESHOLD: 5,
  RECENT_ACTIVITIES_LIMIT: 15,
} as const;
