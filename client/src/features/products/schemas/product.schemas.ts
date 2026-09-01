import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuRegex = /^[A-Za-z0-9-_]{3,64}$/;

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name cannot exceed 200 characters'),
  slug: z
    .string()
    .trim()
    .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
    .optional()
    .or(z.literal('')),
  shortDescription: z
    .string()
    .trim()
    .max(500, 'Short description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(10000, 'Description cannot exceed 10000 characters')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().min(1, 'Please select a valid category'),
  brandId: z.string().optional().or(z.literal('')),
  featured: z.boolean().default(false),
  tagsInput: z.string().optional().or(z.literal('')), // Comma-separated tags string in UI
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

export const variantFormSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .regex(skuRegex, 'SKU must be 3-64 characters alphanumeric, hyphens, or underscores'),
    name: z.string().trim().max(150).optional().or(z.literal('')),
    priceMajor: z.coerce.number().min(0, 'Price must be non-negative'),
    compareAtPriceMajor: z.coerce.number().min(0, 'Compare-at price must be non-negative').optional().or(z.literal('')),
    costPriceMajor: z.coerce.number().min(0, 'Cost price must be non-negative').optional().or(z.literal('')),
    barcode: z.string().trim().optional().or(z.literal('')),
    imageUrl: z.string().trim().url('Image URL must be a valid URL').optional().or(z.literal('')),
    weightGrams: z.coerce.number().int().min(0).optional().or(z.literal('')),
    lengthCm: z.coerce.number().min(0).optional().or(z.literal('')),
    widthCm: z.coerce.number().min(0).optional().or(z.literal('')),
    heightCm: z.coerce.number().min(0).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (
        data.compareAtPriceMajor !== '' &&
        data.compareAtPriceMajor !== undefined &&
        typeof data.compareAtPriceMajor === 'number'
      ) {
        return data.compareAtPriceMajor >= data.priceMajor;
      }
      return true;
    },
    {
      message: 'Compare-at price must be greater than or equal to selling price',
      path: ['compareAtPriceMajor'],
    }
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type VariantFormValues = z.infer<typeof variantFormSchema>;
