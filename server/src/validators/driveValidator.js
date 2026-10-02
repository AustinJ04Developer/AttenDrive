import { z } from 'zod';

export const driveEligibilitySchema = z.object({
  minCgpa: z
    .union([z.number(), z.string()])
    .optional()
    .default(0)
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.min(10, num));
    }),
  maxBacklogs: z
    .union([z.number(), z.string()])
    .optional()
    .default(0)
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
    }),
  allowedDepartments: z.array(z.string()).default([]),
  batch: z.string().trim().default(''),
});

export const driveSchema = z.object({
  company: z.string({ required_error: 'Company name is required' }).trim().min(1, 'Company name cannot be empty'),
  role: z.string().trim().default(''),
  packageLpa: z
    .union([z.number(), z.string()])
    .optional()
    .default(0)
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, num);
    }),
  driveDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  driveTime: z.string().trim().default(''),
  venueMode: z.string().trim().default('Offline'),
  coordinator: z.string().trim().default(''),
  eligibility: driveEligibilitySchema.default({}),
  status: z.enum(['Upcoming', 'Ongoing', 'Completed', 'Cancelled']).default('Upcoming'),
  finalized: z.boolean().default(false),
});

export const bulkAssignSchema = z.object({
  studentIds: z.array(z.string()).optional(),
  registerNos: z.array(z.string()).optional(),
  allowIneligible: z.boolean().default(false),
});

export const filterAssignSchema = z.object({
  departments: z.array(z.string()).optional(),
  batches: z.array(z.string()).optional(),
  minCgpa: z.number().optional(),
  maxBacklogs: z.number().optional(),
  allowIneligible: z.boolean().default(false),
});

export const assignStudentToDrivesSchema = z.object({
  driveIds: z.array(z.string()).min(1, 'Select at least one drive'),
  allowIneligible: z.boolean().default(false),
});
