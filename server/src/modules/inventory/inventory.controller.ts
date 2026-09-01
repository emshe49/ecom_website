import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class InventoryController {
  async listInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await inventoryService.listInventory(req.query as any);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getInventoryDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const variantId = req.params.variantId as string;
      const detail = await inventoryService.getInventoryDetail(variantId);
      sendSuccess(res, { inventory: detail }, 200);
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const variantId = req.params.variantId as string;
      const adminId = (req as any).user.id;
      const updated = await inventoryService.adjustStock(
        adminId,
        variantId,
        req.body
      );
      sendSuccess(
        res,
        {
          inventory: updated,
          message: 'Stock adjusted successfully.',
        },
        200
      );
    } catch (error) {
      next(error);
    }
  }

  async updateThreshold(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const variantId = req.params.variantId as string;
      const { lowStockThreshold } = req.body;
      const updated = await inventoryService.updateThreshold(
        variantId,
        lowStockThreshold
      );
      sendSuccess(
        res,
        {
          inventory: updated,
          message: 'Low stock threshold updated successfully.',
        },
        200
      );
    } catch (error) {
      next(error);
    }
  }

  async listTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const variantId = req.params.variantId as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const type = req.query.type as string | undefined;

      const result = await inventoryService.listTransactions(
        variantId,
        page,
        limit,
        type
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async listAllTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const type = req.query.type as string | undefined;

      const result = await inventoryService.listAllTransactions(
        page,
        limit,
        type
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
