import { Request, Response, NextFunction } from 'express';
import { dashboardQuerySchema } from './dashboard.validation.js';
import { dashboardQueryService } from './dashboard-query.service.js';

export class DashboardController {
  async getDashboardOverview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = dashboardQuerySchema.parse(req.query);
      const data = await dashboardQueryService.getDashboardOverview(parsedQuery);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
