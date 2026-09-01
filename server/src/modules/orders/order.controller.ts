import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service.js';
import {
  createOrderSchema,
  cancelOrderSchema,
  customerOrderQuerySchema,
  adminOrderQuerySchema,
  updateOrderStatusSchema,
  adminCancelOrderSchema,
  updateInternalNoteSchema,
} from './order.validation.js';

export const orderController = {
  // Customer Controllers
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = createOrderSchema.parse(req.body);
      const order = await orderService.createOrder(req.user!.id, validatedBody);
      res.status(201).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = customerOrderQuerySchema.parse(req.query);
      const result = await orderService.getCustomerOrders(req.user!.id, query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getCustomerOrderById(req.user!.id, req.params.orderId as string);
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelMyOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = cancelOrderSchema.parse(req.body);
      const order = await orderService.cancelCustomerOrder(
        req.user!.id,
        req.params.orderId as string,
        validatedBody
      );
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin Controllers
  async getAdminOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = adminOrderQuerySchema.parse(req.query);
      const result = await orderService.getAdminOrders(query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAdminOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getAdminOrderById(req.params.orderId as string);
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAdminOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = updateOrderStatusSchema.parse(req.body);
      const order = await orderService.updateAdminOrderStatus(
        req.params.orderId as string,
        req.user!.id,
        validatedBody.status,
        validatedBody.note
      );
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelAdminOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = adminCancelOrderSchema.parse(req.body);
      const order = await orderService.cancelAdminOrder(
        req.params.orderId as string,
        req.user!.id,
        validatedBody.reason
      );
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAdminInternalNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = updateInternalNoteSchema.parse(req.body);
      const order = await orderService.updateAdminInternalNotes(
        req.params.orderId as string,
        validatedBody.internalNotes
      );
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },
};
