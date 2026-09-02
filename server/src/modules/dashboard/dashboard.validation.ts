import { z } from 'zod';
import { DASHBOARD_CONSTANTS, DASHBOARD_INTERVAL } from './dashboard.constants.js';

export const dashboardQuerySchema = z
  .object({
    from: z
      .string()
      .datetime({ message: 'from must be a valid ISO 8601 date string' })
      .optional(),
    to: z
      .string()
      .datetime({ message: 'to must be a valid ISO 8601 date string' })
      .optional(),
    interval: z
      .nativeEnum(DASHBOARD_INTERVAL, {
        errorMap: () => ({
          message: `interval must be one of: ${Object.values(DASHBOARD_INTERVAL).join(', ')}`,
        }),
      })
      .optional()
      .default(DASHBOARD_INTERVAL.DAY),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromDate = new Date(data.from);
        const toDate = new Date(data.to);
        return fromDate.getTime() <= toDate.getTime();
      }
      return true;
    },
    {
      message: "'from' date must be earlier than or equal to 'to' date",
      path: ['from'],
    }
  )
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromDate = new Date(data.from);
        const toDate = new Date(data.to);
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= DASHBOARD_CONSTANTS.MAX_RANGE_DAYS;
      }
      return true;
    },
    {
      message: `Date range cannot exceed ${DASHBOARD_CONSTANTS.MAX_RANGE_DAYS} days`,
      path: ['to'],
    }
  );

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
