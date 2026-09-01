import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import {
  initiatePaymentSchema,
  adminPaymentQuerySchema,
  confirmCodSchema,
} from './payment.validation.js';

export const paymentController = {
  /**
   * GET /api/v1/payments/methods
   */
  async getPaymentMethods(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.getPaymentMethods();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/payments (Customer: initiate payment)
   */
  async initiatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const validatedInput = initiatePaymentSchema.parse(req.body);
      const result = await paymentService.initiatePayment(userId, validatedInput);

      res.status(201).json({
        success: true,
        message: 'Payment initiated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/payments/order/:orderId (Customer: get payment details for order)
   */
  async getPaymentByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const orderId = req.params.orderId as string;
      const payment = await paymentService.getPaymentByOrderId(userId, orderId);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/payments (Admin: list payments)
   */
  async listAdminPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = adminPaymentQuerySchema.parse(req.query);
      const result = await paymentService.listAdminPayments(validatedQuery);

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/payments/:paymentId (Admin: get payment details)
   */
  async getAdminPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = req.params.paymentId as string;
      const payment = await paymentService.getAdminPaymentById(paymentId);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/payments/:paymentId/confirm-cod (Admin: confirm COD collection)
   */
  async confirmCodPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const paymentId = req.params.paymentId as string;
      const validatedInput = confirmCodSchema.parse(req.body);
      const result = await paymentService.confirmCodPayment(paymentId, adminId, validatedInput);

      res.status(200).json({
        success: true,
        message: 'Cash on delivery payment confirmed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/payments/:paymentId/reconcile (Admin: reconcile with provider)
   */
  async reconcilePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const paymentId = req.params.paymentId as string;
      const result = await paymentService.reconcilePayment(paymentId, adminId);


      res.status(200).json({
        success: true,
        message: 'Payment reconciled against provider status successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
