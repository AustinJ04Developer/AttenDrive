import mongoose from 'mongoose';
import { Drive } from '../models/Drive.js';
import { Student } from '../models/Student.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { Attendance } from '../models/Attendance.js';
import { ReportLog } from '../models/ReportLog.js';

// Get attendance sheet for a drive
export const getDriveAttendanceSheet = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search = '', status = '', department = '' } = req.query;

    const drive = await Drive.findById(id).lean();
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    // 1. Get all assigned students for this drive
    const assignments = await DriveAssignment.find({ driveId: id })
      .populate('studentId')
      .lean();

    const assignedStudents = assignments
      .map((a) => a.studentId)
      .filter(Boolean);

    // 2. Get all attendance records for this drive
    const attendanceRecords = await Attendance.find({ driveId: id }).lean();
    const attMap = new Map();
    attendanceRecords.forEach((att) => attMap.set(String(att.studentId), att));

    // 3. Merge into attendance rows
    let rows = assignedStudents.map((s) => {
      const att = attMap.get(String(s._id));
      return {
        studentId: s._id,
        registerNo: s.registerNo,
        name: s.name,
        department: s.department,
        batch: s.batch,
        email: s.email,
        phone: s.phone,
        cgpa: s.cgpa,
        backlogs: s.backlogs,
        status: att ? att.status : 'Unmarked',
        remark: att ? att.remark : '',
        markedAt: att ? att.markedAt : null,
      };
    });

    // Compute metrics over ALL assigned students (before search/filter)
    const totalAssigned = rows.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let unmarkedCount = 0;

    rows.forEach((r) => {
      if (r.status === 'Present') presentCount++;
      else if (r.status === 'Absent') absentCount++;
      else if (r.status === 'Late') lateCount++;
      else unmarkedCount++;
    });

    const attendancePct = totalAssigned > 0 ? Math.round(((presentCount + lateCount) / totalAssigned) * 100) : 0;

    // Apply filtering for UI display
    if (search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      rows = rows.filter((r) => reg.test(r.registerNo) || reg.test(r.name));
    }

    if (status && status !== 'All') {
      rows = rows.filter((r) => r.status === status);
    }

    if (department.trim()) {
      rows = rows.filter((r) => r.department === department.trim());
    }

    res.json({
      success: true,
      drive,
      students: rows,
      stats: {
        totalAssigned,
        presentCount,
        absentCount,
        lateCount,
        unmarkedCount,
        attendancePct,
      },
      finalized: drive.finalized,
    });
  } catch (error) {
    next(error);
  }
};

// Rapid scanner entry: type Reg No and press Enter
export const rapidScanAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { registerNo, status = 'Present', remark = '' } = req.body;

    if (!registerNo || !registerNo.trim()) {
      return res.status(400).json({ success: false, message: 'Register Number is required' });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({
        success: false,
        message: 'Drive attendance is finalized and locked.',
      });
    }

    const regUpper = registerNo.trim().toUpperCase();
    const student = await Student.findOne({ registerNo: regUpper });

    if (!student) {
      return res.status(404).json({
        success: false,
        isWarning: false,
        message: `Student with Register No '${regUpper}' not found in college database.`,
      });
    }

    // Check if student is assigned to this drive
    const assignment = await DriveAssignment.findOne({
      driveId: drive._id,
      studentId: student._id,
    });

    if (!assignment) {
      return res.status(400).json({
        success: false,
        isWarning: true,
        message: `Student ${student.name} (${regUpper}) is NOT assigned to ${drive.company}.`,
        student,
      });
    }

    // Check if already marked
    const existing = await Attendance.findOne({
      driveId: drive._id,
      studentId: student._id,
    });

    const isDuplicateScan = Boolean(existing && existing.status === 'Present');

    const attendanceRecord = await Attendance.findOneAndUpdate(
      { driveId: drive._id, studentId: student._id },
      {
        status,
        remark: remark.trim() || (existing ? existing.remark : ''),
        markedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      isDuplicateScan,
      message: isDuplicateScan
        ? `Duplicate Scan: ${student.name} was already marked Present at ${new Date(existing.markedAt).toLocaleTimeString()}`
        : `Marked Present: ${student.name} (${regUpper})`,
      student: {
        _id: student._id,
        registerNo: student.registerNo,
        name: student.name,
        department: student.department,
        status: attendanceRecord.status,
        markedAt: attendanceRecord.markedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bulk status change for selected rows (Present / Absent / Late) with a remark
export const bulkUpdateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { records = [], status, remark = '', studentIds = [] } = req.body;

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({
        success: false,
        message: 'Drive attendance is finalized and locked.',
      });
    }

    let bulkOps = [];

    // Case 1: Bulk update by studentIds and a common status/remark
    if (studentIds.length > 0 && status) {
      bulkOps = studentIds.map((sId) => ({
        updateOne: {
          filter: { driveId: drive._id, studentId: sId },
          update: {
            $set: {
              status,
              remark: remark.trim(),
              markedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));
    }
    // Case 2: Array of specific student attendance records
    else if (records.length > 0) {
      bulkOps = records.map((r) => ({
        updateOne: {
          filter: { driveId: drive._id, studentId: r.studentId },
          update: {
            $set: {
              status: r.status,
              remark: (r.remark || '').trim(),
              markedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));
    } else {
      return res.status(400).json({ success: false, message: 'No attendance updates provided' });
    }

    const result = await Attendance.bulkWrite(bulkOps, { ordered: false });

    res.json({
      success: true,
      message: `Updated attendance for ${bulkOps.length} student(s)`,
      modifiedCount: result.modifiedCount || 0,
      upsertedCount: result.upsertedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

// "Mark all Present" or "Mark all Absent" for all assigned students in drive
export const markAllAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'Present' } = req.body;

    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'Present' or 'Absent'" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({ success: false, message: 'Drive attendance is finalized and locked.' });
    }

    const assignments = await DriveAssignment.find({ driveId: id }, { studentId: 1 }).lean();
    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'No students assigned to this drive' });
    }

    const bulkOps = assignments.map((a) => ({
      updateOne: {
        filter: { driveId: drive._id, studentId: a.studentId },
        update: {
          $set: {
            status,
            markedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(bulkOps, { ordered: false });

    res.json({
      success: true,
      message: `Marked all ${assignments.length} assigned students as ${status}`,
      count: assignments.length,
      status,
    });
  } catch (error) {
    next(error);
  }
};

// Paste/Upload Present Register Numbers (Present = pasted, rest of assigned = Absent)
export const pastePresentRegisterNos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { registerNos = [], commit = true } = req.body;

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.finalized) {
      return res.status(400).json({ success: false, message: 'Drive attendance is finalized and locked.' });
    }

    const normalizedPasted = Array.from(
      new Set(registerNos.map((r) => String(r).trim().toUpperCase()).filter(Boolean))
    );

    // 1. Get all assigned students for this drive
    const assignments = await DriveAssignment.find({ driveId: id })
      .populate('studentId', 'registerNo name department')
      .lean();

    const assignedMap = new Map();
    assignments.forEach((a) => {
      if (a.studentId) assignedMap.set(a.studentId.registerNo, a.studentId._id);
    });

    const presentIds = [];
    const absentIds = [];
    const unmatchedNumbers = [];

    // Find which pasted numbers are valid & assigned
    const pastedSet = new Set(normalizedPasted);

    pastedSet.forEach((reg) => {
      if (assignedMap.has(reg)) {
        presentIds.push(assignedMap.get(reg));
      } else {
        unmatchedNumbers.push(reg);
      }
    });

    // The remaining assigned students become Absent
    assignedMap.forEach((studentId, reg) => {
      if (!pastedSet.has(reg)) {
        absentIds.push(studentId);
      }
    });

    // If commit is false, return preview only
    if (!commit) {
      return res.json({
        success: true,
        preview: {
          totalAssigned: assignments.length,
          presentCount: presentIds.length,
          absentCount: absentIds.length,
          unmatchedCount: unmatchedNumbers.length,
          unmatchedNumbers,
        },
      });
    }

    // Execute bulk write
    const bulkOps = [
      ...presentIds.map((sId) => ({
        updateOne: {
          filter: { driveId: drive._id, studentId: sId },
          update: { $set: { status: 'Present', markedAt: new Date() } },
          upsert: true,
        },
      })),
      ...absentIds.map((sId) => ({
        updateOne: {
          filter: { driveId: drive._id, studentId: sId },
          update: { $set: { status: 'Absent', markedAt: new Date() } },
          upsert: true,
        },
      })),
    ];

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }

    res.json({
      success: true,
      message: `Marked ${presentIds.length} Present and ${absentIds.length} Absent`,
      summary: {
        totalAssigned: assignments.length,
        presentCount: presentIds.length,
        absentCount: absentIds.length,
        unmatchedCount: unmatchedNumbers.length,
        unmatchedNumbers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Finalize and lock attendance for a drive
export const finalizeAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await Drive.findById(id);

    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    // 1. Find all assigned students
    const assignments = await DriveAssignment.find({ driveId: id }, { studentId: 1 }).lean();
    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot finalize drive with 0 assigned students' });
    }

    // 2. Any unmarked assigned students become Absent by default
    const existingAtt = await Attendance.find({ driveId: id }, { studentId: 1 }).lean();
    const markedStudentSet = new Set(existingAtt.map((a) => String(a.studentId)));

    const unmarkedAssignments = assignments.filter(
      (a) => !markedStudentSet.has(String(a.studentId))
    );

    if (unmarkedAssignments.length > 0) {
      const defaultAbsentOps = unmarkedAssignments.map((a) => ({
        updateOne: {
          filter: { driveId: drive._id, studentId: a.studentId },
          update: { $set: { status: 'Absent', remark: 'Auto-marked Absent on Finalize', markedAt: new Date() } },
          upsert: true,
        },
      }));
      await Attendance.bulkWrite(defaultAbsentOps, { ordered: false });
    }

    // 3. Mark drive as finalized and Completed
    drive.finalized = true;
    if (drive.status === 'Upcoming' || drive.status === 'Ongoing') {
      drive.status = 'Completed';
    }
    await drive.save();

    // 4. Log in ReportLog
    await ReportLog.create({
      driveId: drive._id,
      type: 'drive_attendance',
      title: `${drive.company} Placement Drive Attendance Finalized`,
      meta: {
        company: drive.company,
        role: drive.role,
        finalizedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Drive attendance for ${drive.company} has been finalized and locked for reporting.`,
      finalized: true,
      drive,
    });
  } catch (error) {
    next(error);
  }
};

// Unlock attendance (admin override to allow re-marking if needed)
export const unlockAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await Drive.findById(id);

    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    drive.finalized = false;
    await drive.save();

    res.json({
      success: true,
      message: `Drive attendance for ${drive.company} has been unlocked for editing.`,
      finalized: false,
      drive,
    });
  } catch (error) {
    next(error);
  }
};
