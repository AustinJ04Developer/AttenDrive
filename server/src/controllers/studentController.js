import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { Attendance } from '../models/Attendance.js';
import { ImportLog } from '../models/ImportLog.js';
import {
  singleStudentSchema,
  bulkStudentImportSchema,
  bulkEditSchema,
  bulkDeleteSchema,
} from '../validators/studentValidator.js';

// Get students with pagination, search, filtering, and sorting
export const getStudents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      department = '',
      batch = '',
      sortBy = 'registerNo',
      sortOrder = 'asc',
      exportAll = 'false',
    } = req.query;

    const filter = {};

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { registerNo: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    if (department.trim()) {
      filter.department = department.trim();
    }

    if (batch.trim()) {
      filter.batch = batch.trim();
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Export all matching rows without pagination
    if (exportAll === 'true' || exportAll === true) {
      const students = await Student.find(filter).sort(sortOptions).lean();
      return res.json({
        success: true,
        total: students.length,
        students,
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [students, total, distinctDepartments, distinctBatches] = await Promise.all([
      Student.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Student.countDocuments(filter),
      Student.distinct('department'),
      Student.distinct('batch'),
    ]);

    res.json({
      success: true,
      students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      filters: {
        departments: distinctDepartments.filter(Boolean).sort(),
        batches: distinctBatches.filter(Boolean).sort(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Check which register numbers already exist in DB
export const checkExistingRegisterNos = async (req, res, next) => {
  try {
    const { registerNos = [] } = req.body;
    if (!Array.isArray(registerNos) || registerNos.length === 0) {
      return res.json({ success: true, existingRegisterNos: [] });
    }

    const normalizedNos = registerNos.map((no) => String(no).trim().toUpperCase()).filter(Boolean);
    const existing = await Student.find(
      { registerNo: { $in: normalizedNos } },
      { registerNo: 1 }
    ).lean();

    const existingSet = existing.map((s) => s.registerNo);
    res.json({
      success: true,
      existingRegisterNos: existingSet,
    });
  } catch (error) {
    next(error);
  }
};

// Get single student by ID
export const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Include student's attendance records across drives
    const attendanceRecords = await Attendance.find({ studentId: student._id })
      .populate('driveId', 'company role driveDate status venueMode')
      .lean();

    res.json({
      success: true,
      student: {
        ...student,
        attendanceHistory: attendanceRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a single student (fallback form)
export const createStudent = async (req, res, next) => {
  try {
    const validatedData = singleStudentSchema.parse(req.body);

    const existing = await Student.findOne({ registerNo: validatedData.registerNo });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student with Register No ${validatedData.registerNo} already exists`,
      });
    }

    const student = await Student.create(validatedData);
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student,
    });
  } catch (error) {
    next(error);
  }
};

// Update a single student
export const updateStudent = async (req, res, next) => {
  try {
    const validatedData = singleStudentSchema.parse(req.body);

    // If registerNo is changed, check for conflict
    const existing = await Student.findOne({
      registerNo: validatedData.registerNo,
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Register No ${validatedData.registerNo} is already used by another student`,
      });
    }

    const student = await Student.findByIdAndUpdate(req.params.id, validatedData, {
      new: true,
      runValidators: true,
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      student,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a single student with cascade
export const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Cascade delete assignments and attendance
    await Promise.all([
      Student.findByIdAndDelete(req.params.id),
      DriveAssignment.deleteMany({ studentId: req.params.id }),
      Attendance.deleteMany({ studentId: req.params.id }),
    ]);

    res.json({
      success: true,
      message: `Student ${student.registerNo} and related records deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Import Students with batches of 500, row-level validation, and conflict options
export const bulkImportStudents = async (req, res, next) => {
  try {
    const { students: rawStudents, conflictMode = 'skip' } = bulkStudentImportSchema.parse(req.body);

    const BATCH_SIZE = 500;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];
    const insertedIds = [];

    // Step 1: Pre-validate each row using Zod and track within-batch duplicates
    const validatedRows = [];
    const seenRegisterNos = new Set();

    rawStudents.forEach((row, index) => {
      const rowNumber = index + 1;
      try {
        const parsed = singleStudentSchema.parse(row);
        if (seenRegisterNos.has(parsed.registerNo)) {
          failed++;
          errors.push({
            row: rowNumber,
            registerNo: parsed.registerNo,
            reason: `Duplicate Register No within the same file: ${parsed.registerNo}`,
          });
        } else {
          seenRegisterNos.add(parsed.registerNo);
          validatedRows.push({ ...parsed, originalRowIndex: rowNumber });
        }
      } catch (err) {
        failed++;
        const reason = err.errors ? err.errors.map((e) => e.message).join('; ') : err.message;
        errors.push({
          row: rowNumber,
          registerNo: row.registerNo || '(Empty)',
          reason,
        });
      }
    });

    // Step 2: Process validated rows in chunks of BATCH_SIZE
    for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
      const chunk = validatedRows.slice(i, i + BATCH_SIZE);
      const regNos = chunk.map((r) => r.registerNo);

      // Find existing students in DB for this chunk
      const existingInDb = await Student.find(
        { registerNo: { $in: regNos } },
        { registerNo: 1, _id: 1 }
      ).lean();

      const existingMap = new Map();
      existingInDb.forEach((s) => existingMap.set(s.registerNo, s._id));

      if (conflictMode === 'skip') {
        // Skip existing records and insert only new ones
        const toInsert = [];
        chunk.forEach((item) => {
          if (existingMap.has(item.registerNo)) {
            skipped++;
          } else {
            toInsert.push({
              registerNo: item.registerNo,
              name: item.name,
              department: item.department,
              batch: item.batch,
              email: item.email,
              phone: item.phone,
              cgpa: item.cgpa,
              backlogs: item.backlogs,
            });
          }
        });

        if (toInsert.length > 0) {
          try {
            // insertMany with ordered:false to catch duplicate key errors without failing entire batch
            const inserted = await Student.insertMany(toInsert, { ordered: false });
            added += inserted.length;
            inserted.forEach((doc) => insertedIds.push(doc._id));
          } catch (insertError) {
            // Mongoose / MongoBulkWriteError handling for duplicate keys
            if (insertError.insertedDocs) {
              added += insertError.insertedDocs.length;
              insertError.insertedDocs.forEach((doc) => insertedIds.push(doc._id));
            }
            if (insertError.writeErrors) {
              insertError.writeErrors.forEach((we) => {
                if (we.code === 11000) {
                  skipped++;
                } else {
                  failed++;
                  errors.push({
                    row: i + (we.index || 0) + 1,
                    registerNo: chunk[we.index]?.registerNo || '',
                    reason: we.errmsg || 'Failed to insert row',
                  });
                }
              });
            }
          }
        }
      } else {
        // 'update' conflict mode: update existing or insert new using bulkWrite
        const bulkOps = chunk.map((item) => {
          const isExisting = existingMap.has(item.registerNo);
          return {
            updateOne: {
              filter: { registerNo: item.registerNo },
              update: {
                $set: {
                  name: item.name,
                  department: item.department,
                  batch: item.batch,
                  email: item.email,
                  phone: item.phone,
                  cgpa: item.cgpa,
                  backlogs: item.backlogs,
                },
              },
              upsert: true,
            },
          };
        });

        if (bulkOps.length > 0) {
          const bulkRes = await Student.bulkWrite(bulkOps, { ordered: false });
          const upsertedCount = bulkRes.upsertedCount || 0;
          const modifiedCount = bulkRes.modifiedCount || 0;
          const matchedCount = bulkRes.matchedCount || 0;

          added += upsertedCount;
          // Updated is either modified or matched without changes
          updated += matchedCount;

          // Collect upserted IDs for rollback/undo
          if (bulkRes.upsertedIds) {
            Object.values(bulkRes.upsertedIds).forEach((id) => insertedIds.push(id));
          }
        }
      }
    }

    // Step 3: Record in ImportLog
    const importLog = await ImportLog.create({
      type: 'students',
      added,
      updated,
      skipped,
      failed,
      insertedIds,
    });

    res.json({
      success: true,
      message: 'Bulk student processing complete',
      summary: {
        total: rawStudents.length,
        added,
        updated,
        skipped,
        failed,
      },
      errors,
      importLogId: importLog._id,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Edit students (e.g. change department or batch for selected student IDs)
export const bulkEditStudents = async (req, res, next) => {
  try {
    const { studentIds, department, batch } = bulkEditSchema.parse(req.body);

    const updateFields = {};
    if (department !== undefined && department.trim() !== '') {
      updateFields.department = department.trim();
    }
    if (batch !== undefined && batch.trim() !== '') {
      updateFields.batch = batch.trim();
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update values provided (department or batch)',
      });
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: updateFields }
    );

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} student(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Delete students (by IDs, department, or batch) with cascade
export const bulkDeleteStudents = async (req, res, next) => {
  try {
    const { studentIds, department, batch } = bulkDeleteSchema.parse(req.body);

    const filter = {};
    if (studentIds && studentIds.length > 0) {
      filter._id = { $in: studentIds };
    }
    if (department) {
      filter.department = department.trim();
    }
    if (batch) {
      filter.batch = batch.trim();
    }

    // Find all matching student IDs first to cascade delete related assignments and attendance
    const matchingStudents = await Student.find(filter, { _id: 1 }).lean();
    const idsToDelete = matchingStudents.map((s) => s._id);

    if (idsToDelete.length === 0) {
      return res.json({
        success: true,
        message: 'No matching students found to delete',
        deletedCount: 0,
      });
    }

    // Cascade delete across collections
    const [delStudents, delAssignments, delAttendance] = await Promise.all([
      Student.deleteMany({ _id: { $in: idsToDelete } }),
      DriveAssignment.deleteMany({ studentId: { $in: idsToDelete } }),
      Attendance.deleteMany({ studentId: { $in: idsToDelete } }),
    ]);

    res.json({
      success: true,
      message: `Deleted ${delStudents.deletedCount} student(s), ${delAssignments.deletedCount} drive assignments, and ${delAttendance.deletedCount} attendance records`,
      deletedCount: delStudents.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Undo a bulk import using the IDs stored in importLogs
export const undoImport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const importLog = await ImportLog.findById(id);

    if (!importLog) {
      return res.status(404).json({ success: false, message: 'Import log not found' });
    }

    if (!importLog.insertedIds || importLog.insertedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No inserted records found to undo for this import log (records may have been updated or already removed)',
      });
    }

    const idsToDelete = importLog.insertedIds;

    // Cascade delete inserted students and any dependent records
    const [delStudents, delAssignments, delAttendance] = await Promise.all([
      Student.deleteMany({ _id: { $in: idsToDelete } }),
      DriveAssignment.deleteMany({ studentId: { $in: idsToDelete } }),
      Attendance.deleteMany({ studentId: { $in: idsToDelete } }),
      ImportLog.findByIdAndDelete(id),
    ]);

    res.json({
      success: true,
      message: `Undo successful: Removed ${delStudents.deletedCount} student(s) added during this import`,
      deletedCount: delStudents.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
