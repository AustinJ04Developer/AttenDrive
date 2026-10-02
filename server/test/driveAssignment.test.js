import { describe, it, expect } from 'vitest';
import { isStudentEligible, buildEligibilityQuery } from '../src/controllers/driveController.js';
import { driveSchema, bulkAssignSchema } from '../src/validators/driveValidator.js';

describe('Drive Validation & Eligibility Logic', () => {
  it('should validate drive creation schema with defaults', () => {
    const valid = {
      company: 'Google',
      role: 'Software Development Engineer',
      packageLpa: 24,
      eligibility: {
        minCgpa: 8.0,
        maxBacklogs: 0,
        allowedDepartments: ['Computer Science and Engineering'],
        batch: '2021-2025',
      },
    };

    const parsed = driveSchema.parse(valid);
    expect(parsed.company).toBe('Google');
    expect(parsed.packageLpa).toBe(24);
    expect(parsed.status).toBe('Upcoming');
    expect(parsed.finalized).toBe(false);
  });

  it('should correctly evaluate student eligibility criteria', () => {
    const criteria = {
      minCgpa: 7.5,
      maxBacklogs: 0,
      allowedDepartments: ['Computer Science and Engineering', 'Information Technology'],
      batch: '2021-2025',
    };

    const eligibleStudent = {
      registerNo: '21CS001',
      name: 'John Doe',
      department: 'Computer Science and Engineering',
      batch: '2021-2025',
      cgpa: 8.2,
      backlogs: 0,
    };

    const lowCgpaStudent = {
      ...eligibleStudent,
      cgpa: 7.1,
    };

    const backlogsStudent = {
      ...eligibleStudent,
      backlogs: 1,
    };

    const wrongDeptStudent = {
      ...eligibleStudent,
      department: 'Mechanical Engineering',
    };

    const wrongBatchStudent = {
      ...eligibleStudent,
      batch: '2022-2026',
    };

    expect(isStudentEligible(eligibleStudent, criteria)).toBe(true);
    expect(isStudentEligible(lowCgpaStudent, criteria)).toBe(false);
    expect(isStudentEligible(backlogsStudent, criteria)).toBe(false);
    expect(isStudentEligible(wrongDeptStudent, criteria)).toBe(false);
    expect(isStudentEligible(wrongBatchStudent, criteria)).toBe(false);
  });

  it('should construct accurate MongoDB eligibility query', () => {
    const criteria = {
      minCgpa: 8.0,
      maxBacklogs: 1,
      allowedDepartments: ['Computer Science and Engineering'],
      batch: '2021-2025',
    };

    const query = buildEligibilityQuery(criteria);
    expect(query.cgpa).toEqual({ $gte: 8.0 });
    expect(query.backlogs).toEqual({ $lte: 1 });
    expect(query.department.$in).toContain('Computer Science and Engineering');
    expect(query.department.$in).toContain('CSE');
    expect(query.batch).toBe('2021-2025');
  });

  it('should validate bulk assignment schema with allowIneligible override', () => {
    const payload = {
      registerNos: ['21CS001', '21CS002'],
      allowIneligible: true,
    };

    const parsed = bulkAssignSchema.parse(payload);
    expect(parsed.registerNos.length).toBe(2);
    expect(parsed.allowIneligible).toBe(true);
  });

  it('should validate bulk assignment schema with studentIds for manual selection', () => {
    const payload = {
      studentIds: ['660000000000000000000001', '660000000000000000000002'],
      allowIneligible: false,
    };

    const parsed = bulkAssignSchema.parse(payload);
    expect(parsed.studentIds.length).toBe(2);
    expect(parsed.allowIneligible).toBe(false);
  });
});
