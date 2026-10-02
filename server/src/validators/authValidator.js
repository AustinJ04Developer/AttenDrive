import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
  role: z
    .enum(['admin', 'coordinator', 'staff'])
    .optional()
    .default('coordinator'),
  department: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default('Placement Cell'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .optional(),
  department: z
    .string()
    .trim()
    .max(100)
    .optional(),
  currentPassword: z
    .string()
    .optional(),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .optional(),
});
