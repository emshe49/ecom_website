import { Request, Response, NextFunction } from 'express';
import { checkoutService } from './checkout.service.js';

export class CheckoutController {
  async createCheckoutSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await checkoutService.createCheckoutSession(
        req.user!.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }

  async getActiveCheckout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await checkoutService.getActiveCheckout(req.user!.id);
      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }

  async revalidateCheckout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await checkoutService.revalidateCheckout(req.user!.id);
      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelCheckout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await checkoutService.cancelCheckout(req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}


export const checkoutController = new CheckoutController();
