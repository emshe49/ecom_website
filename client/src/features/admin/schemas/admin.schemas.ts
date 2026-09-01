import { z } from 'zod';

const staffRoles = [
  'ADMIN',
  'PRODUCT_MANAGER',
  'ORDER_MANAGER',
  'INVENTORY_MANAGER',
  'CUSTOMER_SUPPORT',
] as const;

export const createStaffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  role: z.enum(staffRoles, {
    errorMap: () => ({ message: 'Please select a valid staff role' }),
  }),
});

export const updateStaffRoleSchema = z.object({
  role: z.enum(staffRoles, {
    errorMap: () => ({ message: 'Please select a valid staff role' }),
  }),
});

export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;
export type UpdateStaffRoleFormValues = z.infer<typeof updateStaffRoleSchema>;
