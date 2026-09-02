import { ANALYTICS_CONSTANTS, ANALYTICS_GROUP_BY, AnalyticsGroupBy } from './analytics.constants.js';
import { AnalyticsBaseQuery } from './analytics.types.js';

export interface ResolvedDateRange {
  fromDate: Date;
  toDate: Date;
  prevFromDate: Date;
  prevToDate: Date;
  groupBy: AnalyticsGroupBy;
}

export class AnalyticsDateService {
  /**
   * Resolves current and comparison previous period date ranges
   */
  resolveDateRange(query: AnalyticsBaseQuery): ResolvedDateRange {
    const toDate = query.to ? new Date(query.to) : new Date();
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - ANALYTICS_CONSTANTS.DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevToDate = new Date(fromDate.getTime());
    const prevFromDate = new Date(fromDate.getTime() - durationMs);
    const groupBy: AnalyticsGroupBy = query.groupBy || ANALYTICS_GROUP_BY.DAY;

    return { fromDate, toDate, prevFromDate, prevToDate, groupBy };
  }

  /**
   * Returns Mongo $dateToString format corresponding to the chosen groupBy
   */
  getMongoDateFormat(groupBy: AnalyticsGroupBy): string {
    switch (groupBy) {
      case ANALYTICS_GROUP_BY.MONTH:
        return '%Y-%m';
      case ANALYTICS_GROUP_BY.WEEK:
        return '%Y-W%V';
      case ANALYTICS_GROUP_BY.YEAR:
        return '%Y';
      case ANALYTICS_GROUP_BY.DAY:
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * Safe percentage change calculation with zero-division protection
   */
  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  /**
   * Helper to build comparison metric object
   */
  buildMetricComparison(current: number, previous: number) {
    return {
      current,
      previous,
      changePercentage: this.calculatePercentageChange(current, previous),
    };
  }
}

export const analyticsDateService = new AnalyticsDateService();
