import { z } from 'zod';

export const uuidParamSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const createQuizSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
  })
  .strict();

export const updateQuizSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title cannot exceed 150 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (title or description) must be provided for update',
  });

export const createQuestionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Question text is required')
      .max(500, 'Question text cannot exceed 500 characters'),
    order: z
      .number({ message: 'Order is required' })
      .int('Order must be an integer')
      .positive('Order must be a positive integer'),
    timeLimitSeconds: z
      .number({ message: 'timeLimitSeconds is required' })
      .int('Time limit must be an integer')
      .positive('Time limit must be a positive integer'),
    maxPoints: z
      .number({ message: 'maxPoints is required' })
      .int('Max points must be an integer')
      .positive('Max points must be a positive integer'),
  })
  .strict();

export const updateQuestionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Question text cannot be empty')
      .max(500, 'Question text cannot exceed 500 characters')
      .optional(),
    order: z
      .number()
      .int('Order must be an integer')
      .positive('Order must be a positive integer')
      .optional(),
    timeLimitSeconds: z
      .number()
      .int('Time limit must be an integer')
      .positive('Time limit must be a positive integer')
      .optional(),
    maxPoints: z
      .number()
      .int('Max points must be an integer')
      .positive('Max points must be a positive integer')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const createOptionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Option text is required')
      .max(200, 'Option text cannot exceed 200 characters'),
    order: z
      .number({ message: 'Order is required' })
      .int('Order must be an integer')
      .positive('Order must be a positive integer'),
    isCorrect: z.boolean({ message: 'isCorrect is required' }),
  })
  .strict();

export const updateOptionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Option text cannot be empty')
      .max(200, 'Option text cannot exceed 200 characters')
      .optional(),
    order: z
      .number()
      .int('Order must be an integer')
      .positive('Order must be a positive integer')
      .optional(),
    isCorrect: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
