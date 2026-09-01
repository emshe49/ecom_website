import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const brandIdParamSchema = z.object({
  brandId: z
    .string({ required_error: 'Brand ID is required' })
    .regex(objectIdRegex, 'Invalid brand ID format'),
});

export const brandSlugParamSchema = z.object({
  slug: z
    .string({ required_error: 'Slug is required' })
    .trim()
    .min(1, 'Slug cannot be empty')
    .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
});

export const createBrandSchema = z
  .object({
    name: z
      .string({ required_error: 'Brand name is required' })
      .trim()
      .min(2, 'Brand name must be at least 2 characters')
      .max(100, 'Brand name cannot exceed 100 characters'),
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
    logoUrl: z
      .string()
      .trim()
      .url('Logo URL must be a valid URL')
      .nullable()
      .optional()
      .or(z.literal('')),
    websiteUrl: z
      .string()
      .trim()
      .url('Website URL must be a valid URL')
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
  .strict('Unexpected fields provided in brand creation request');

export const updateBrandSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Brand name must be at least 2 characters')
      .max(100, 'Brand name cannot exceed 100 characters')
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
    logoUrl: z
      .string()
      .trim()
      .url('Logo URL must be a valid URL')
      .nullable()
      .optional()
      .or(z.literal('')),
    websiteUrl: z
      .string()
      .trim()
      .url('Website URL must be a valid URL')
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
  .strict('Unexpected fields provided in brand update request');

export const brandQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'sortOrder', 'createdAt', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
