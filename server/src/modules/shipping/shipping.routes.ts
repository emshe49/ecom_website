import { Router } from 'express';
import { shippingController } from './shipping.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const shippingRouter = Router();

// All customer shipping routes require authentication
shippingRouter.use(authenticate);

// Calculate shipping quote for customer's cart and destination address
shippingRouter.post('/quote', shippingController.getQuote);

// Customer tracking route: get shipment for own order
shippingRouter.get('/orders/:orderId/shipment', shippingController.getOrderShipment);
