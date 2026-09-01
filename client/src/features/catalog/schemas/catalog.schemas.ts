import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
  imageUrl: z
    .string()
    .trim()
    .url('Image URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  seoTitle: z
    .string()
    .trim()
    .max(70, 'SEO title cannot exceed 70 characters')
    .optional()
    .or(z.literal('')),
  seoDescription: z
    .string()
    .trim()
    .max(160, 'SEO description cannot exceed 160 characters')
    .optional()
    .or(z.literal('')),
});

export const brandFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Brand name must be at least 2 characters')
    .max(100, 'Brand name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  logoUrl: z
    .string()
    .trim()
    .url('Logo URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  websiteUrl: z
    .string()
    .trim()
    .url('Website URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  seoTitle: z
    .string()
    .trim()
    .max(70, 'SEO title cannot exceed 70 characters')
    .optional()
    .or(z.literal('')),
  seoDescription: z
    .string()
    .trim()
    .max(160, 'SEO description cannot exceed 160 characters')
    .optional()
    .or(z.literal('')),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type BrandFormValues = z.infer<typeof brandFormSchema>;
