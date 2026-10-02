import { z } from 'zod';

export const singleStudentSchema = z.object({
  registerNo: z
    .string({ required_error: 'Register Number is required' })
    .trim()
    .min(1, 'Register Number cannot be empty')
    .transform((val) => val.toUpperCase()),
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty'),
  department: z.string().trim().default(''),
  batch: z.string().trim().default(''),
  email: z
    .string()
    .trim()
    .refine((val) => val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email address format',
    })
    .default(''),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || /^[+]?[\d\s-]{7,15}$/.test(val),
      {
        message: 'Invalid phone number format',
      }
    )
    .default(''),
  cgpa: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    })
    .refine((val) => val === null || (val >= 0 && val <= 10), {
      message: 'CGPA must be between 0.0 and 10.0',
    }),
  backlogs: z
    .union([z.number(), z.string()])
    .optional()
    .default(0)
    .transform((val) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
    }),
});

export const bulkStudentImportSchema = z.object({
  students: z.array(z.record(z.any())).min(1, 'At least one student record is required'),
  conflictMode: z.enum(['skip', 'update']).default('skip'),
});

export const bulkEditSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student must be selected'),
  department: z.string().trim().optional(),
  batch: z.string().trim().optional(),
});

export const bulkDeleteSchema = z.object({
  studentIds: z.array(z.string()).optional(),
  department: z.string().trim().optional(),
  batch: z.string().trim().optional(),
}).refine(
  (data) => (data.studentIds && data.studentIds.length > 0) || data.department || data.batch,
  {
    message: 'Either studentIds, department, or batch must be provided for bulk delete',
  }
);
