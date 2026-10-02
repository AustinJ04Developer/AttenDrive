import { describe, it, expect } from 'vitest';
import {
  singleStudentSchema,
  bulkStudentImportSchema,
  bulkEditSchema,
  bulkDeleteSchema,
} from '../src/validators/studentValidator.js';

describe('Student Validation Logic', () => {
  it('should validate and sanitize a valid student object', () => {
    const raw = {
      registerNo: ' 21cs001 ',
      name: '  John Doe  ',
      department: 'Computer Science',
      batch: '2021-2025',
      email: 'john@college.edu',
      phone: '9876543210',
      cgpa: '8.45',
      backlogs: '0',
    };

    const parsed = singleStudentSchema.parse(raw);
    expect(parsed.registerNo).toBe('21CS001');
    expect(parsed.name).toBe('John Doe');
    expect(parsed.cgpa).toBe(8.45);
    expect(parsed.backlogs).toBe(0);
  });

  it('should reject student with empty register number', () => {
    const raw = {
      registerNo: '   ',
      name: 'Jane Doe',
    };

    expect(() => singleStudentSchema.parse(raw)).toThrow();
  });

  it('should reject student with CGPA outside 0 to 10', () => {
    const rawInvalidHigh = {
      registerNo: '21CS002',
      name: 'Jane Doe',
      cgpa: 10.5,
    };
    expect(() => singleStudentSchema.parse(rawInvalidHigh)).toThrow(/CGPA must be between 0.0 and 10.0/);

    const rawInvalidLow = {
      registerNo: '21CS003',
      name: 'Bob Doe',
      cgpa: -1.2,
    };
    expect(() => singleStudentSchema.parse(rawInvalidLow)).toThrow(/CGPA must be between 0.0 and 10.0/);
  });

  it('should reject invalid email format when email is provided', () => {
    const raw = {
      registerNo: '21CS004',
      name: 'Alice',
      email: 'not-an-email',
    };
    expect(() => singleStudentSchema.parse(raw)).toThrow(/Invalid email address format/);
  });

  it('should allow empty email or phone without throwing', () => {
    const raw = {
      registerNo: '21CS005',
      name: 'Charlie',
      email: '',
      phone: '',
    };
    const parsed = singleStudentSchema.parse(raw);
    expect(parsed.email).toBe('');
    expect(parsed.phone).toBe('');
  });

  it('should validate bulk student import schema with conflict modes', () => {
    const validPayload = {
      students: [
        { registerNo: '21CS001', name: 'John Doe' },
        { registerNo: '21CS002', name: 'Jane Smith' },
      ],
      conflictMode: 'update',
    };

    const parsed = bulkStudentImportSchema.parse(validPayload);
    expect(parsed.conflictMode).toBe('update');
    expect(parsed.students.length).toBe(2);

    // Invalid conflict mode
    expect(() =>
      bulkStudentImportSchema.parse({
        students: [{ registerNo: '21CS001', name: 'Test' }],
        conflictMode: 'invalid_mode',
      })
    ).toThrow();
  });

  it('should validate bulk edit schema', () => {
    const valid = {
      studentIds: ['660000000000000000000001', '660000000000000000000002'],
      department: 'ECE',
      batch: '2022-2026',
    };

    const parsed = bulkEditSchema.parse(valid);
    expect(parsed.studentIds.length).toBe(2);
    expect(parsed.department).toBe('ECE');
  });

  it('should validate bulk delete requiring either studentIds, department or batch', () => {
    expect(() => bulkDeleteSchema.parse({})).toThrow();
    expect(bulkDeleteSchema.parse({ department: 'CSE' }).department).toBe('CSE');
  });
});
