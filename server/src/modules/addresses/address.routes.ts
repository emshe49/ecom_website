import { Router } from 'express';
import { addressController } from './address.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from './address.validation.js';

const router = Router();

// All address routes require authentication
router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createAddressSchema }),
  (req, res, next) => addressController.create(req, res, next)
);

router.get('/', (req, res, next) => addressController.list(req, res, next));

router.get(
  '/:addressId',
  validateRequest({ params: addressIdParamSchema }),
  (req, res, next) => addressController.getOne(req, res, next)
);

router.patch(
  '/:addressId',
  validateRequest({ params: addressIdParamSchema, body: updateAddressSchema }),
  (req, res, next) => addressController.update(req, res, next)
);

router.delete(
  '/:addressId',
  validateRequest({ params: addressIdParamSchema }),
  (req, res, next) => addressController.delete(req, res, next)
);

router.patch(
  '/:addressId/default-shipping',
  validateRequest({ params: addressIdParamSchema }),
  (req, res, next) => addressController.setDefaultShipping(req, res, next)
);

router.patch(
  '/:addressId/default-billing',
  validateRequest({ params: addressIdParamSchema }),
  (req, res, next) => addressController.setDefaultBilling(req, res, next)
);

export const addressRouter = router;
