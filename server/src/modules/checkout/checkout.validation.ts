import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCheckoutSchema = z
  .object({
    shippingAddressId: z
      .string({ required_error: 'Shipping address ID is required.' })
      .regex(objectIdRegex, 'Invalid shipping address ID format.'),
    billingSameAsShipping: z.boolean({
      required_error: 'billingSameAsShipping flag is required.',
    }),
    billingAddressId: z
      .string()
      .regex(objectIdRegex, 'Invalid billing address ID format.')
      .optional(),
    shippingMethodId: z
      .string()
      .regex(objectIdRegex, 'Invalid shipping method ID format.')
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (!data.billingSameAsShipping && !data.billingAddressId) {
        return false;
      }
      return true;
    },
    {
      message: 'billingAddressId is required when billingSameAsShipping is false.',
      path: ['billingAddressId'],
    }
  );

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
