import { Request, Response, NextFunction } from 'express';
import { shippingQuoteService } from './shipping-quote.service.js';
import { shipmentService } from './shipment.service.js';
import { shippingQuoteSchema } from './shipping.validation.js';

export const shippingController = {
  /**
   * POST /api/v1/shipping/quote
   * Returns eligible shipping methods and quote fees for authenticated customer's cart.
   */
  async getQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = shippingQuoteSchema.parse(req.body);
      const userId = req.user!.id;
      const quote = await shippingQuoteService.getQuote(userId, validated);
      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/orders/:orderId/shipment
   * Returns safe tracking information for an owned order.
   */
  async getOrderShipment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const userId = req.user!.id;
      const shipment = await shipmentService.getCustomerShipment(orderId, userId);
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (err) {
      next(err);
    }
  },
};
