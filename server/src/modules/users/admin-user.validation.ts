import { z } from 'zod';
import { ROLES } from '../authorization/roles.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Allowed staff roles for creation & role updates (excludes CUSTOMER and SUPER_ADMIN)
const allowedStaffRoles = [
  ROLES.ADMIN,
  ROLES.PRODUCT_MANAGER,
  ROLES.ORDER_MANAGER,
  ROLES.INVENTORY_MANAGER,
  ROLES.CUSTOMER_SUPPORT,
] as const;

export const staffIdParamSchema = z.object({
  userId: z
    .string({ required_error: 'User ID is required' })
    .regex(objectIdRegex, 'Invalid user ID format'),
});

export const createStaffSchema = z
  .object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name cannot exceed 50 characters'),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    role: z.enum(allowedStaffRoles, {
      errorMap: () => ({
        message: `Role must be one of: ${allowedStaffRoles.join(', ')}`,
      }),
    }),
  })
  .strict('Unexpected fields provided in staff creation request');

export const updateStaffRoleSchema = z
  .object({
    role: z.enum(allowedStaffRoles, {
      errorMap: () => ({
        message: `Role must be one of: ${allowedStaffRoles.join(', ')}`,
      }),
    }),
  })
  .strict('Unexpected fields provided in role update request');

export const updateStaffStatusSchema = z
  .object({
    isActive: z.boolean({ required_error: 'isActive status is required' }),
  })
  .strict('Unexpected fields provided in status update request');

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
