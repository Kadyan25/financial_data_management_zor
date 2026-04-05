import { z } from 'zod';

const ALLOWED_CATEGORIES = [
  'salary',
  'freelance',
  'investment',
  'rent',
  'utilities',
  'food',
  'transport',
  'healthcare',
  'education',
  'entertainment',
  'shopping',
  'insurance',
  'taxes',
  'other',
] as const;

export const createRecordSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  type: z.enum(['INCOME', 'EXPENSE'], { required_error: 'Type is required' }),
  category: z
    .string()
    .min(1, 'Category is required')
    .transform((v) => v.toLowerCase().trim()),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((v) => new Date(v)),
  notes: z.string().max(500).optional(),
});

export const updateRecordSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z
    .string()
    .min(1)
    .transform((v) => v.toLowerCase().trim())
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((v) => new Date(v))
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const recordListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  userId: z.string().optional(), // ADMIN/ANALYST can scope to specific user
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type RecordListQuery = z.infer<typeof recordListQuerySchema>;
