import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categoryIdParamSchema = z.object({
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format'),
});

export const categorySlugParamSchema = z.object({
  slug: z
    .string({ required_error: 'Slug is required' })
    .trim()
    .min(1, 'Slug cannot be empty')
    .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
});

export const createCategorySchema = z
  .object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(2, 'Category name must be at least 2 characters')
      .max(100, 'Category name cannot exceed 100 characters'),
    slug: z
      .string()
      .trim()
      .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .nullable()
      .optional(),
    parentId: z
      .string()
      .regex(objectIdRegex, 'Invalid parent category ID format')
      .nullable()
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .url('Image URL must be a valid URL')
      .nullable()
      .optional()
      .or(z.literal('')),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int('Sort order must be an integer').min(0).optional().default(0),
    seoTitle: z
      .string()
      .trim()
      .max(70, 'SEO title cannot exceed 70 characters')
      .nullable()
      .optional(),
    seoDescription: z
      .string()
      .trim()
      .max(160, 'SEO description cannot exceed 160 characters')
      .nullable()
      .optional(),
  })
  .strict('Unexpected fields provided in category creation request');

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Category name must be at least 2 characters')
      .max(100, 'Category name cannot exceed 100 characters')
      .optional(),
    slug: z
      .string()
      .trim()
      .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .nullable()
      .optional(),
    parentId: z
      .string()
      .regex(objectIdRegex, 'Invalid parent category ID format')
      .nullable()
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .url('Image URL must be a valid URL')
      .nullable()
      .optional()
      .or(z.literal('')),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int('Sort order must be an integer').min(0).optional(),
    seoTitle: z
      .string()
      .trim()
      .max(70, 'SEO title cannot exceed 70 characters')
      .nullable()
      .optional(),
    seoDescription: z
      .string()
      .trim()
      .max(160, 'SEO description cannot exceed 160 characters')
      .nullable()
      .optional(),
  })
  .strict('Unexpected fields provided in category update request');

export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  parentId: z
    .string()
    .optional()
    .transform((val) => (val === 'null' ? null : val)),
  sortBy: z.enum(['name', 'sortOrder', 'createdAt', 'updatedAt']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
