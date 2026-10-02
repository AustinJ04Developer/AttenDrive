import mongoose from 'mongoose';
import { Drive } from '../models/Drive.js';
import { Student } from '../models/Student.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { Attendance } from '../models/Attendance.js';
import {
  driveSchema,
  bulkAssignSchema,
  filterAssignSchema,
  assignStudentToDrivesSchema,
} from '../validators/driveValidator.js';
import {
  OFFICIAL_DEPARTMENTS,
  normalizeDepartment,
  matchesAllowedDepartment,
} from '../config/departments.js';

// Helper to test if a student meets drive eligibility criteria
export const isStudentEligible = (student, criteria) => {
  if (!criteria) return true;

  // Min CGPA check
  if (criteria.minCgpa !== undefined && criteria.minCgpa > 0) {
    if (student.cgpa === null || student.cgpa === undefined || student.cgpa < criteria.minCgpa) {
      return false;
    }
  }

  // Max backlogs check
  if (criteria.maxBacklogs !== undefined) {
    if ((student.backlogs || 0) > criteria.maxBacklogs) {
      return false;
    }
  }

  // Allowed departments check (matches both code and full name)
  if (criteria.allowedDepartments && criteria.allowedDepartments.length > 0) {
    if (!matchesAllowedDepartment(student.department, criteria.allowedDepartments)) {
      return false;
    }
  }

  // Batch check
  if (criteria.batch && criteria.batch.trim() !== '') {
    if (student.batch !== criteria.batch.trim()) {
      return false;
    }
  }

  return true;
};

// Build MongoDB filter query based on drive eligibility
export const buildEligibilityQuery = (criteria) => {
  const query = {};

  if (!criteria) return query;

  if (criteria.minCgpa !== undefined && criteria.minCgpa > 0) {
    query.cgpa = { $gte: criteria.minCgpa };
  }

  if (criteria.maxBacklogs !== undefined) {
    query.backlogs = { $lte: criteria.maxBacklogs };
  }

  if (criteria.allowedDepartments && criteria.allowedDepartments.length > 0) {
    // Expand to match both code and full name in MongoDB
    const departmentMatchers = new Set();
    criteria.allowedDepartments.forEach((dept) => {
      departmentMatchers.add(dept);
      const normalized = normalizeDepartment(dept);
      departmentMatchers.add(normalized);
      const matchObj = OFFICIAL_DEPARTMENTS.find(
        (od) => od.name.toLowerCase() === normalized.toLowerCase() || od.code.toLowerCase() === dept.toLowerCase()
      );
      if (matchObj) {
        departmentMatchers.add(matchObj.name);
        departmentMatchers.add(matchObj.code);
      }
    });

    query.department = { $in: Array.from(departmentMatchers) };
  }

  if (criteria.batch && criteria.batch.trim() !== '') {
    query.batch = criteria.batch.trim();
  }

  return query;
};

// Get list of drives with counts and filters
export const getDrives = async (req, res, next) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { company: searchRegex },
        { role: searchRegex },
        { coordinator: searchRegex },
      ];
    }

    const drives = await Drive.find(filter)
      .sort({ driveDate: -1, createdAt: -1 })
      .lean();

    // Enrich drives with counts of assigned students and attendance
    const driveIds = drives.map((d) => d._id);

    const [assignmentCounts, attendanceStats] = await Promise.all([
      DriveAssignment.aggregate([
        { $match: { driveId: { $in: driveIds } } },
        { $group: { _id: '$driveId', count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { driveId: { $in: driveIds } } },
        {
          $group: {
            _id: '$driveId',
            totalMarked: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const assignmentMap = new Map();
    assignmentCounts.forEach((a) => assignmentMap.set(String(a._id), a.count));

    const attendanceMap = new Map();
    attendanceStats.forEach((att) => attendanceMap.set(String(att._id), att));

    const enrichedDrives = drives.map((d) => {
      const idStr = String(d._id);
      const assignedCount = assignmentMap.get(idStr) || 0;
      const att = attendanceMap.get(idStr) || { totalMarked: 0, present: 0, absent: 0, late: 0 };
      const attendancePct = assignedCount > 0 ? Math.round((att.present / assignedCount) * 100) : 0;

      return {
        ...d,
        assignedCount,
        attendanceStats: {
          ...att,
          attendancePct,
        },
      };
    });

    res.json({
      success: true,
      drives: enrichedDrives,
      total: enrichedDrives.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get single drive by ID
export const getDriveById = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id).lean();
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    const [assignedCount, eligibleCount, attendanceStats] = await Promise.all([
      DriveAssignment.countDocuments({ driveId: drive._id }),
      Student.countDocuments(buildEligibilityQuery(drive.eligibility)),
      Attendance.aggregate([
        { $match: { driveId: drive._id } },
        {
          $group: {
            _id: '$driveId',
            totalMarked: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const att = attendanceStats[0] || { totalMarked: 0, present: 0, absent: 0, late: 0 };
    const attendancePct = assignedCount > 0 ? Math.round((att.present / assignedCount) * 100) : 0;

    res.json({
      success: true,
      drive: {
        ...drive,
        assignedCount,
        eligibleCount,
        attendanceStats: {
          ...att,
          attendancePct,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new drive
export const createDrive = async (req, res, next) => {
  try {
    const validatedData = driveSchema.parse(req.body);
    const drive = await Drive.create(validatedData);
    res.status(201).json({
      success: true,
      message: 'Placement drive created successfully',
      drive,
    });
  } catch (error) {
    next(error);
  }
};

// Update drive
export const updateDrive = async (req, res, next) => {
  try {
    const validatedData = driveSchema.parse(req.body);
    const drive = await Drive.findByIdAndUpdate(req.params.id, validatedData, {
      new: true,
      runValidators: true,
    });

    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    res.json({
      success: true,
      message: 'Drive updated successfully',
      drive,
    });
  } catch (error) {
    next(error);
  }
};

// Delete drive with cascade delete
export const deleteDrive = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    await Promise.all([
      Drive.findByIdAndDelete(req.params.id),
      DriveAssignment.deleteMany({ driveId: req.params.id }),
      Attendance.deleteMany({ driveId: req.params.id }),
    ]);

    res.json({
      success: true,
      message: `Drive '${drive.company}' and associated assignments & attendance deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk create drives via CSV upload
export const bulkCreateDrives = async (req, res, next) => {
  try {
    const { drives: rawDrives } = req.body;
    if (!Array.isArray(rawDrives) || rawDrives.length === 0) {
      return res.status(400).json({ success: false, message: 'No drives data provided' });
    }

    const createdDrives = [];
    const errors = [];

    for (let i = 0; i < rawDrives.length; i++) {
      try {
        const parsed = driveSchema.parse(rawDrives[i]);
        const drive = await Drive.create(parsed);
        createdDrives.push(drive);
      } catch (err) {
        errors.push({
          row: i + 1,
          company: rawDrives[i]?.company || 'Unknown',
          reason: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk drive creation complete: ${createdDrives.length} added, ${errors.length} failed`,
      addedCount: createdDrives.length,
      errors,
    });
  } catch (error) {
    next(error);
  }
};

// Preview eligible students count for a drive
export const getEligiblePreview = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    const query = buildEligibilityQuery(drive.eligibility);
    const eligibleStudents = await Student.find(query).sort({ registerNo: 1 }).lean();

    // Check which ones are already assigned
    const assigned = await DriveAssignment.find({ driveId: drive._id }, { studentId: 1 }).lean();
    const assignedSet = new Set(assigned.map((a) => String(a.studentId)));

    const newEligible = eligibleStudents.filter((s) => !assignedSet.has(String(s._id)));
    const alreadyAssignedEligible = eligibleStudents.filter((s) => assignedSet.has(String(s._id)));

    res.json({
      success: true,
      totalEligible: eligibleStudents.length,
      newToAssignCount: newEligible.length,
      alreadyAssignedCount: alreadyAssignedEligible.length,
      sampleEligible: eligibleStudents.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
};

// Auto-assign all eligible students based on drive eligibility
export const autoAssignEligible = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({
        success: false,
        message: 'Drive attendance is finalized and locked. Cannot modify student assignments.',
      });
    }

    const query = buildEligibilityQuery(drive.eligibility);
    const eligibleStudents = await Student.find(query, { _id: 1 }).lean();

    if (eligibleStudents.length === 0) {
      return res.json({
        success: true,
        message: 'No eligible students found matching the criteria',
        assignedCount: 0,
      });
    }

    // Build bulk upsert operations on (driveId, studentId)
    const bulkOps = eligibleStudents.map((s) => ({
      updateOne: {
        filter: { driveId: drive._id, studentId: s._id },
        update: { $setOnInsert: { driveId: drive._id, studentId: s._id } },
        upsert: true,
      },
    }));

    const result = await DriveAssignment.bulkWrite(bulkOps, { ordered: false });
    const newlyAssigned = result.upsertedCount || 0;
    const existing = eligibleStudents.length - newlyAssigned;

    res.json({
      success: true,
      message: `Assigned ${newlyAssigned} new eligible student(s) (${existing} were already assigned)`,
      newlyAssigned,
      alreadyAssigned: existing,
      totalEligible: eligibleStudents.length,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Assign students by Register Numbers, IDs, or Filter with eligibility warning & override
export const bulkAssignStudents = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({
        success: false,
        message: 'Drive attendance is finalized and locked.',
      });
    }

    const { studentIds = [], registerNos = [], allowIneligible = false } = bulkAssignSchema.parse(req.body);

    let candidateStudents = [];
    const unmatchedRegisterNos = [];

    // Resolve by IDs
    if (studentIds.length > 0) {
      candidateStudents = await Student.find({ _id: { $in: studentIds } }).lean();
    }

    // Resolve by Register Numbers with single $in query
    if (registerNos.length > 0) {
      const normalizedNos = registerNos.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
      const foundStudents = await Student.find({ registerNo: { $in: normalizedNos } }).lean();

      const foundRegSet = new Set(foundStudents.map((s) => s.registerNo));
      normalizedNos.forEach((reg) => {
        if (!foundRegSet.has(reg)) {
          unmatchedRegisterNos.push(reg);
        }
      });

      // Merge avoiding duplicate students
      const candidateIdSet = new Set(candidateStudents.map((s) => String(s._id)));
      foundStudents.forEach((fs) => {
        if (!candidateIdSet.has(String(fs._id))) {
          candidateStudents.push(fs);
          candidateIdSet.add(String(fs._id));
        }
      });
    }

    if (candidateStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid students found from provided IDs or Register Numbers',
        unmatchedRegisterNos,
      });
    }

    // Categorize students by eligibility
    const eligibleStudents = [];
    const ineligibleStudents = [];

    candidateStudents.forEach((student) => {
      const eligible = isStudentEligible(student, drive.eligibility);
      if (eligible) {
        eligibleStudents.push(student);
      } else {
        ineligibleStudents.push(student);
      }
    });

    let studentsToAssign = [];
    let overriddenCount = 0;

    if (allowIneligible) {
      studentsToAssign = candidateStudents;
      overriddenCount = ineligibleStudents.length;
    } else {
      studentsToAssign = eligibleStudents;
    }

    if (studentsToAssign.length === 0) {
      return res.status(400).json({
        success: false,
        message: `All ${ineligibleStudents.length} student(s) are ineligible based on drive criteria. Use 'allowIneligible' to override.`,
        ineligibleCount: ineligibleStudents.length,
        ineligibleStudents: ineligibleStudents.map((s) => ({
          registerNo: s.registerNo,
          name: s.name,
          cgpa: s.cgpa,
          backlogs: s.backlogs,
          department: s.department,
        })),
        unmatchedRegisterNos,
      });
    }

    // Upsert into DriveAssignment
    const bulkOps = studentsToAssign.map((s) => ({
      updateOne: {
        filter: { driveId: drive._id, studentId: s._id },
        update: { $setOnInsert: { driveId: drive._id, studentId: s._id } },
        upsert: true,
      },
    }));

    const result = await DriveAssignment.bulkWrite(bulkOps, { ordered: false });
    const newlyAssigned = result.upsertedCount || 0;
    const alreadyAssigned = studentsToAssign.length - newlyAssigned;

    res.json({
      success: true,
      message: `Successfully assigned ${newlyAssigned} student(s) to ${drive.company}`,
      summary: {
        totalRequested: candidateStudents.length,
        newlyAssigned,
        alreadyAssigned,
        ineligibleCount: ineligibleStudents.length,
        overriddenCount,
        unmatchedCount: unmatchedRegisterNos.length,
      },
      ineligibleStudents: ineligibleStudents.map((s) => ({
        registerNo: s.registerNo,
        name: s.name,
        cgpa: s.cgpa,
        backlogs: s.backlogs,
      })),
      unmatchedRegisterNos,
    });
  } catch (error) {
    next(error);
  }
};

// Get assigned students for a drive
export const getDriveAssignments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search = '', department = '', page = 1, limit = 50 } = req.query;

    const drive = await Drive.findById(id).lean();
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    // Find all assignments for this drive
    const assignments = await DriveAssignment.find({ driveId: id })
      .populate('studentId')
      .lean();

    // Map and filter populated students
    let students = assignments
      .map((a) => a.studentId)
      .filter(Boolean);

    if (search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      students = students.filter(
        (s) => reg.test(s.registerNo) || reg.test(s.name) || reg.test(s.email)
      );
    }

    if (department.trim()) {
      students = students.filter((s) => s.department === department.trim());
    }

    // Check attendance records for each student in this drive
    const studentIds = students.map((s) => s._id);
    const attendanceRecords = await Attendance.find({
      driveId: id,
      studentId: { $in: studentIds },
    }).lean();

    const attMap = new Map();
    attendanceRecords.forEach((att) => attMap.set(String(att.studentId), att));

    // Tag eligibility status and attendance status
    const enrichedList = students.map((student) => {
      const eligible = isStudentEligible(student, drive.eligibility);
      const att = attMap.get(String(student._id));
      return {
        ...student,
        isEligible: eligible,
        attendanceStatus: att ? att.status : 'Unmarked',
        attendanceRemark: att ? att.remark : '',
      };
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const paginated = enrichedList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      drive,
      students: paginated,
      totalAssigned: enrichedList.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(enrichedList.length / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bulk remove assigned students from drive
export const bulkRemoveAssignments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentIds = [], removeAll = false } = req.body;

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({
        success: false,
        message: 'Drive attendance is finalized and locked. Cannot remove students.',
      });
    }

    let filter = { driveId: id };
    if (!removeAll) {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No student IDs specified to remove' });
      }
      filter.studentId = { $in: studentIds };
    }

    const [delAssignments, delAttendance] = await Promise.all([
      DriveAssignment.deleteMany(filter),
      Attendance.deleteMany(filter),
    ]);

    res.json({
      success: true,
      message: `Removed ${delAssignments.deletedCount} assigned student(s) from ${drive.company}`,
      removedCount: delAssignments.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Assign one student to multiple drives in one action
export const assignStudentToMultipleDrives = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { driveIds = [], allowIneligible = false } = assignStudentToDrivesSchema.parse(req.body);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const drives = await Drive.find({ _id: { $in: driveIds } });
    const eligibleDrives = [];
    const ineligibleDrives = [];

    drives.forEach((d) => {
      if (isStudentEligible(student, d.eligibility)) {
        eligibleDrives.push(d);
      } else {
        ineligibleDrives.push(d);
      }
    });

    const targetDrives = allowIneligible ? drives : eligibleDrives;

    if (targetDrives.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student is ineligible for all selected drives',
        ineligibleDrives: ineligibleDrives.map((d) => d.company),
      });
    }

    const bulkOps = targetDrives.map((d) => ({
      updateOne: {
        filter: { driveId: d._id, studentId: student._id },
        update: { $setOnInsert: { driveId: d._id, studentId: student._id } },
        upsert: true,
      },
    }));

    const result = await DriveAssignment.bulkWrite(bulkOps, { ordered: false });

    res.json({
      success: true,
      message: `Assigned ${student.registerNo} to ${result.upsertedCount} new drive(s)`,
      assignedCount: result.upsertedCount,
      ineligibleDrives: ineligibleDrives.map((d) => d.company),
    });
  } catch (error) {
    next(error);
  }
};
